import { SecHd } from '../site';
import { Poll } from './fold';

// Surfaces the participatory features (the edge no global competitor has) into
// one prominent mid-page band: the interactive poll plus functional invitations
// to the on-page debate and the real UGC submission channel.
export function CommunityBand() {
  return (
    <div className="sec community">
      <SecHd t="شارك المتابع" meta="رأيك وخبرك جزء من التغطية" />
      <div className="cm-wrap">
        <div className="cm-poll"><Poll /></div>
        <div className="cm-invite">
          <a className="cm-cta" href="#debate">
            <span className="cm-ic vs">وجهان</span>
            <span className="cm-tx"><b>اقرأ الرأي والرأي الآخر</b><small>صوّت لوجهة النظر التي تؤيدها</small></span>
            <span className="cm-arw" aria-hidden>‹</span>
          </a>
          <a className="cm-cta" href="https://wa.me/962790000000?text=%D8%AE%D8%A8%D8%B1%20%D9%84%D9%84%D9%85%D8%AA%D8%A7%D8%A8%D8%B9" target="_blank" rel="noopener">
            <span className="cm-ic eye">عين المواطن</span>
            <span className="cm-tx"><b>أرسل خبرك أو صورتك</b><small>نراجعه وننشره — مساهمة القرّاء</small></span>
            <span className="cm-arw" aria-hidden>‹</span>
          </a>
        </div>
      </div>
    </div>
  );
}
