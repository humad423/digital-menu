import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { getLegalContent } from '@/utils/menuCache'

export const metadata: Metadata = { title: 'الشروط | ألف سوق' }

export default async function TermsPage() {
  const { terms } = await getLegalContent()

  return (
    <LegalPage
      title="شروط الاستخدام"
      content={terms}
      fallback={
        <>
          <p>ألف سوق منصة تعرض المتاجر القريبة منك ومنتجاتها وأسعارها، وليس وسيطاً في البيع.</p>
          <p>يتم الطلب مباشرة بينك وبين المتجر عبر واتساب. والمتجر وحده مسؤول عن منتجاته وأسعاره وتوصيله، ولا يستلم ألف سوق أي طلبات أو مدفوعات.</p>
          <p>يضيف كل متجر أسعاره بنفسه، وقد يتغير السعر عند الطلب، فتأكد منه مع المتجر.</p>
        </>
      }
    />
  )
}
