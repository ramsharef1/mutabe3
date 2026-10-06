# WebP image pipeline — portable handoff (from okath.news)

A Laravel + GD recipe that (1) converts every uploaded image to a WebP master, and
(2) serves resized WebP derivatives on demand. Proven on okath: homepage 13.6 MB → 2.3 MB,
media 330 MB → 164 MB. Works on any Laravel 10/11 app.

## Prerequisite
PHP GD compiled with WebP (`php -r 'var_dump(function_exists("imagewebp"));'` → true).
No Composer package needed. (Intervention Image is an alternative but GD alone is enough.)

## Two layers

### Layer 1 — `app/Support/ImageIngest.php` (convert on upload)
Transcodes an upload to one WebP master (q82, width capped 2048, EXIF-fixed, transparency
flattened to white). Original never stored. Falls back to a raw store on any failure.

```php
<?php
namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageIngest
{
    /** @param \Illuminate\Http\UploadedFile|\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file */
    public static function storeWebp($file, string $dir = 'articles', int $quality = 82, int $cap = 2048): string
    {
        $src = $file->getRealPath();
        if ($src && is_file($src)) {
            try {
                $rel = self::transcode($src, $dir, $quality, $cap);
                if ($rel !== null) return $rel;
            } catch (\Throwable $e) { report($e); }
        }
        return $file->store($dir, 'public'); // safety net: never lose an upload
    }

    protected static function transcode(string $src, string $dir, int $quality, int $cap): ?string
    {
        $info = @getimagesize($src);
        if (! $info) return null;
        [$ow, $oh, $type] = $info;

        $old = ini_get('memory_limit');
        ini_set('memory_limit', '768M');
        try {
            $img = match ($type) {
                IMAGETYPE_JPEG => imagecreatefromjpeg($src),
                IMAGETYPE_PNG  => imagecreatefrompng($src),
                IMAGETYPE_WEBP => imagecreatefromwebp($src),
                default => null,
            };
            if (! $img) return null;

            if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
                $exif = @exif_read_data($src);
                $o = (int) ($exif['Orientation'] ?? 1);
                if (in_array($o, [3, 6, 8], true)) {
                    $img = imagerotate($img, match ($o) { 3 => 180, 6 => -90, 8 => 90 }, 0);
                    if ($o !== 3) [$ow, $oh] = [$oh, $ow];
                }
            }

            if ($ow > $cap) {
                $nh = max(1, (int) round($oh * $cap / $ow));
                $out = imagecreatetruecolor($cap, $nh);
                imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
                imagecopyresampled($out, $img, 0, 0, 0, 0, $cap, $nh, $ow, $oh);
                imagedestroy($img); $img = $out;
            } elseif ($type === IMAGETYPE_PNG) {
                $flat = imagecreatetruecolor($ow, $oh);
                imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
                imagecopy($flat, $img, 0, 0, 0, 0, $ow, $oh);
                imagedestroy($img); $img = $flat;
            }

            $rel = rtrim($dir, '/') . '/' . (string) Str::ulid() . '.webp';
            $dst = Storage::disk('public')->path($rel);
            if (! is_dir(dirname($dst))) @mkdir(dirname($dst), 0775, true);

            $ok = imagewebp($img, $dst, $quality);
            imagedestroy($img);
            if (! $ok || ! is_file($dst) || filesize($dst) < 100) {
                if (is_file($dst)) @unlink($dst);
                return null;
            }
            return $rel;
        } finally { ini_set('memory_limit', $old); }
    }
}
```

### Layer 2 — `app/Support/Thumb.php` (serve resized WebP)
`Thumb::url($path, $w)` returns a cached WebP at width `$w`, regenerated when the source
changes, falling back to the original on error. SVG/GIF pass through (keep animation).

```php
<?php
namespace App\Support;

use Illuminate\Support\Facades\Storage;

class Thumb
{
    public const WIDTHS = [160, 320, 480, 640, 960, 1280];

    public static function url(?string $path, int $w = 640): ?string
    {
        if (blank($path)) return null;
        if (preg_match('#^(https?:)?//#i', $path) || str_starts_with($path, 'data:')) return $path;

        $rel = ltrim(preg_replace('#^/?storage/#i', '', $path), '/');
        $src = storage_path('app/public/' . $rel);
        if (! is_file($src)) return Storage::url($rel);

        $ext = strtolower(pathinfo($src, PATHINFO_EXTENSION));
        if (in_array($ext, ['svg', 'gif'], true)) return Storage::url($rel);

        $w = in_array($w, self::WIDTHS, true) ? $w : 640;
        $name = 'thumbs/' . $w . '/' . preg_replace('#\.[a-z0-9]+$#i', '', $rel) . '.webp';
        $dst = storage_path('app/public/' . $name);

        if (! is_file($dst) || filemtime($dst) < filemtime($src)) {
            try { self::make($src, $dst, $w); }
            catch (\Throwable $e) { return Storage::url($rel); }
        }
        return Storage::url($name) . '?v=' . filemtime($dst);
    }

    public static function make(string $src, string $dst, int $w): void
    {
        $info = @getimagesize($src);
        if (! $info) throw new \RuntimeException('unreadable image');
        [$ow, $oh, $type] = $info;

        $old = ini_get('memory_limit'); ini_set('memory_limit', '768M');
        try {
            $img = match ($type) {
                IMAGETYPE_JPEG => imagecreatefromjpeg($src),
                IMAGETYPE_PNG  => imagecreatefrompng($src),
                IMAGETYPE_WEBP => imagecreatefromwebp($src),
                default => throw new \RuntimeException('unsupported type'),
            };
            if (! $img) throw new \RuntimeException('decode failed');

            if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
                $exif = @exif_read_data($src);
                $o = (int) ($exif['Orientation'] ?? 1);
                if (in_array($o, [3, 6, 8], true)) {
                    $img = imagerotate($img, match ($o) { 3 => 180, 6 => -90, 8 => 90 }, 0);
                    if ($o !== 3) [$ow, $oh] = [$oh, $ow];
                }
            }
            if ($ow > $w) {
                $nh = max(1, (int) round($oh * $w / $ow));
                $out = imagecreatetruecolor($w, $nh);
                imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
                imagecopyresampled($out, $img, 0, 0, 0, 0, $w, $nh, $ow, $oh);
                imagedestroy($img); $img = $out;
            } elseif ($type === IMAGETYPE_PNG) {
                $flat = imagecreatetruecolor($ow, $oh);
                imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
                imagecopy($flat, $img, 0, 0, 0, 0, $ow, $oh);
                imagedestroy($img); $img = $flat;
            }
            if (! is_dir(dirname($dst))) @mkdir(dirname($dst), 0775, true);
            if (! imagewebp($img, $dst, 70)) throw new \RuntimeException('write failed');
            imagedestroy($img);
        } finally { ini_set('memory_limit', $old); }
    }
}
```

## Wiring
**Admin upload (Filament example):**
```php
Forms\Components\FileUpload::make('featured_image')
    ->image()->disk('public')->visibility('public')->directory('articles')
    ->acceptedFileTypes(['image/jpeg','image/png','image/webp'])->maxSize(3072)
    ->saveUploadedFileUsing(fn ($file): string => \App\Support\ImageIngest::storeWebp($file, 'articles'));
// rich-text/Trix body images:
// ->saveUploadedFileAttachmentsUsing(fn ($file): string => \App\Support\ImageIngest::storeWebp($file, 'body'))
```
(Plain controller upload: `$path = ImageIngest::storeWebp($request->file('image'), 'articles');` then save `$path`.)

**Templates — print through Thumb, with srcset:**
```blade
<img src="{{ \App\Support\Thumb::url($article->featured_image, 640) }}"
     srcset="{{ \App\Support\Thumb::url($article->featured_image, 640) }} 640w,
             {{ \App\Support\Thumb::url($article->featured_image, 960) }} 960w"
     sizes="(max-width:1024px) 100vw, 640px"
     alt="{{ $article->featured_image_alt }}" width="640" height="360" loading="lazy" decoding="async">
```

## Backfill EXISTING images (the "current ones")
New uploads are handled by Layer 1 automatically. For images already on disk, two things:

**A. Serve them as WebP immediately** — nothing to run. The moment templates use `Thumb::url()`,
every existing JPEG/PNG is served as a cached WebP derivative. Zero migration needed for delivery.

**B. (Optional) Convert the stored masters to WebP to reclaim disk** — one artisan command.
Create `app/Console/Commands/ConvertImagesToWebp.php`:

```php
<?php
namespace App\Console\Commands;

use App\Models\Article;
use App\Support\ImageIngest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ConvertImagesToWebp extends Command
{
    protected $signature = 'images:to-webp {--column=featured_image} {--dir=articles} {--delete-original} {--dry}';
    protected $description = 'Re-encode existing non-WebP masters to WebP and repoint the DB column';

    public function handle(): int
    {
        $col = $this->option('column'); $dir = $this->option('dir');
        $disk = Storage::disk('public');
        $done = 0; $skip = 0; $fail = 0;

        foreach (Article::query()->whereNotNull($col)->cursor() as $a) {
            $rel = ltrim(preg_replace('#^/?storage/#i', '', (string) $a->$col), '/');
            if (Str::endsWith(strtolower($rel), '.webp')) { $skip++; continue; }
            $abs = $disk->path($rel);
            if (! is_file($abs)) { $fail++; continue; }

            $info = @getimagesize($abs);
            if (! $info || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) { $skip++; continue; }

            // reuse the exact ingest transcode by faking an UploadedFile from the stored path
            $tmp = new \Illuminate\Http\UploadedFile($abs, basename($abs), $info['mime'], null, true);
            if ($this->option('dry')) { $this->line("would convert: $rel"); $done++; continue; }

            $new = ImageIngest::storeWebp($tmp, $dir);          // writes a new .webp master
            if (! Str::endsWith($new, '.webp')) { $fail++; continue; }

            $a->forceFill([$col => $new])->saveQuietly();
            if ($this->option('delete-original')) @unlink($abs);
            $done++;
        }
        $this->info("converted: $done · skipped(already webp/other): $skip · failed: $fail");
        return self::SUCCESS;
    }
}
```

Run it safely:
```bash
php artisan images:to-webp --column=featured_image --dir=articles --dry        # preview
php artisan images:to-webp --column=featured_image --dir=articles              # convert, keep originals
php artisan images:to-webp --column=featured_image --dir=articles --delete-original   # convert + reclaim disk
# repeat for other columns, e.g. --column=og_image, and for body images if stored in a table
```
Body/inline images embedded in HTML content need an HTML-rewrite pass (find `<img src>` in the
body column, convert each file, swap the src) — ask me if that applies and I'll add it.

**C. (Optional) Pre-warm derivative thumbs** so the first visitor isn't the one who generates them:
```php
// okath's okath:thumbs — generalized
foreach (Article::whereNotNull('featured_image')->cursor() as $a)
    foreach ([480, 960] as $w) \App\Support\Thumb::url($a->featured_image, $w);
```

## okath-specifics to change for your site
- Model/column names: okath uses `Article::featured_image` (+ `body` HTML, `og_image`).
- Storage dirs: `articles/` (featured), `body/` (inline). Rename to taste.
- Thumb widths whitelist — match your layout's real rendered sizes.
- okath keeps advertiser creatives (`ads/`) as original jpg/png/**gif** on purpose (animation).
