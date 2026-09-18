'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '../../lib/auth';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('رابط التفعيل غير صحيح');
        return;
      }

      try {
        const result = await verifyEmail(token);
        if (result.success) {
          setStatus('success');
          setMessage('تم تفعيل حسابك بنجاح!');
          setTimeout(() => router.push('/auth/login'), 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'فشل التفعيل');
        }
      } catch (error) {
        setStatus('error');
        setMessage('حدث خطأ أثناء التفعيل');
      }
    }

    verify();
  }, [token, router]);

  return (
    <div className="verify-container">
      <div className="verify-box">
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <p>جاري تفعيل حسابك...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="icon icon-success">✓</div>
            <h1>تم التفعيل بنجاح!</h1>
            <p>{message}</p>
            <p className="info">جاري التوجيه إلى صفحة تسجيل الدخول...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon icon-error">✕</div>
            <h1>فشل التفعيل</h1>
            <p>{message}</p>
            {email && (
              <p className="info">
                إذا لم تصلك رسالة التفعيل، تحقق من مجلد البريد العشوائي أو حاول <Link href="/auth/signup">إنشاء حساب جديد</Link>
              </p>
            )}
            <Link href="/" className="btn btn-primary">
              العودة إلى الرئيسية
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        .verify-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }

        .verify-box {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
          direction: rtl;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #c41e3a;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .icon-success {
          color: #28a745;
        }

        .icon-error {
          color: #c41e3a;
        }

        h1 {
          font-size: 24px;
          margin-bottom: 16px;
          color: #1a1a1a;
        }

        p {
          color: #666;
          margin-bottom: 16px;
          line-height: 1.6;
        }

        .info {
          font-size: 14px;
          color: #999;
        }

        .info a {
          color: #c41e3a;
          text-decoration: none;
          font-weight: 600;
        }

        .info a:hover {
          text-decoration: underline;
        }

        .btn {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #c41e3a;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn:hover {
          background: #a01829;
        }
      `}</style>
    </div>
  );
}
