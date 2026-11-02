import { MapPin } from 'lucide-react'

export type LocationIssue = 'denied' | 'unavailable' | null

/** Stores are only shown from the customer's real position, so this is the way in. */
export default function LocationGate({
  issue,
  locating,
  onLocate,
}: {
  issue: LocationIssue
  locating: boolean
  onLocate: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black leading-snug">شو في حواليك؟</h1>
        <p className="text-muted font-medium mt-1">
          نعرض لك المتاجر القريبة منك ومنتجاتها وأسعارها. لذلك نحتاج أن تسمح لنا بمعرفة موقعك.
        </p>
      </div>

      {issue === 'denied' && (
        <div className="notice notice-warn space-y-2">
          <p className="font-bold">لن تظهر المتاجر إلا بعد السماح بالموقع.</p>
          <p>على أندرويد: اضغط الرمز بجانب عنوان الموقع في أعلى الشاشة، ثم الأذونات، ثم الموقع، ثم سماح.</p>
          <p>على آيفون: اضغط رمز aA بجانب عنوان الموقع، ثم إعدادات موقع الويب، ثم الموقع، ثم سماح.</p>
        </div>
      )}

      {issue === 'unavailable' && (
        <p className="notice notice-warn">لم نتمكن من تحديد موقعك. تأكد أن خدمة الموقع (GPS) تعمل في هاتفك، ثم حاول مرة أخرى.</p>
      )}

      <button onClick={onLocate} disabled={locating} className="btn btn-primary btn-block btn-lg">
        <MapPin size={20} />
        <span>{locating ? 'جاري تحديد موقعك...' : issue ? 'حاول مرة أخرى' : 'اعرض المتاجر القريبة مني'}</span>
      </button>
    </div>
  )
}
