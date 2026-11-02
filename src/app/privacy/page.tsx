import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { getLegalContent } from '@/utils/menuCache'

export const metadata: Metadata = { title: 'سياسة الخصوصية | ألف سوق' }

export default async function PrivacyPolicyPage() {
  const { privacy } = await getLegalContent()

  return (
    <LegalPage
      title="سياسة الخصوصية"
      content={privacy}
      fallback={
        <>
          <p>تصفح ألف سوق لا يحتاج إلى حساب ولا إلى رقم هاتف.</p>
          <h2 className="section-title pt-2">موقعك</h2>
          <p>نستخدم موقعك أو المنطقة التي تختارها لعرض المتاجر القريبة منك، ويُحفظ على جهازك. لا يصل موقعك إلى المتجر إلا إذا اخترت إرساله مع طلبك.</p>
          <h2 className="section-title pt-2">طلباتك</h2>
          <p>يُرسل طلبك من واتساب الخاص بك إلى المتجر مباشرة. ونحفظ نسخة من المنتجات والمبلغ، ومن موقعك إذا اخترت إرساله، لغرض الإحصاءات. الاسم والملاحظة لا يُحفظان عندنا.</p>
          <h2 className="section-title pt-2">الإحصاءات</h2>
          <p>نسجل زيارات الصفحات ونستخدم Google Analytics لنعرف كيف نحسّن الخدمة.</p>
          <h2 className="section-title pt-2">أصحاب المتاجر</h2>
          <p>نحفظ رقم هاتف صاحب المتجر لتسجيل دخوله إلى لوحة المتجر عبر رسالة SMS.</p>
        </>
      }
    />
  )
}
