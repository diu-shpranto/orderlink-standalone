// Settings → Google Sheets — সেলারের নিজের Google Sheet-এ অর্ডার
// অটো-সিঙ্কের সংযোগ, অবস্থা, ইতিহাস ও সমস্যার সমাধান।
// Google যুক্ত না করলে সিঙ্কের প্রতিশ্রুতি দেওয়া হয় না —
// অর্ডার তখন অ্যাপেই থাকে, Sheet-এ যায় না (সত্য কথা)।
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { formatCountBn } from '../lib/pricing.ts'
import {
  captureGoogleTokensAfterRedirect,
  connectGoogleSheets,
  disconnectSheet,
  fetchSheetConnection,
  fetchSheetSyncEvents,
  fetchSheetSyncSummary,
  refreshStoredAccessToken,
  retryFailedSyncs,
  setupSheet,
  type SheetConnection,
  type SheetSyncEvent,
  type SheetSyncSummary,
} from '../lib/sheets.ts'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const EVENT_STATUS_BN: Record<string, string> = {
  synced: 'সিঙ্ক হয়েছে',
  pending: 'অপেক্ষায়',
  failed: 'ব্যর্থ হয়েছে',
}

export default function GoogleSheetsSettings({
  shopName,
}: {
  shopName: string | null
}) {
  const { seller } = useAuth()
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<SheetConnection | null>(null)
  const [summary, setSummary] = useState<SheetSyncSummary | null>(null)
  const [events, setEvents] = useState<SheetSyncEvent[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  async function load() {
    if (!seller) return
    setError('')
    try {
      const [conn, sum, evts] = await Promise.all([
        fetchSheetConnection(seller.id),
        fetchSheetSyncSummary(seller.id),
        fetchSheetSyncEvents(seller.id, 20),
      ])
      setConnection(conn)
      setSummary(sum)
      setEvents(evts)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'লোড করা যায়নি।',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // OAuth থেকে ফিরে এলে টোকেন ধরে সার্ভারে পাঠানো।
    captureGoogleTokensAfterRedirect()
      .then((captured) => {
        if (!captured) return
        if (captured.hasRefreshToken) {
          setMessage(
            `Google যুক্ত হয়েছে${captured.googleEmail ? `: ${captured.googleEmail}` : ''} — এবার নিচে নতুন Sheet বানান বা আগের Sheet-এর লিংক দিন।`,
          )
        } else {
          setMessage(
            'Google যুক্ত হয়েছে, কিন্তু রিফ্রেশ টোকেন পাওয়া যায়নি — সংযোগটি আবার করুন (consent দিয়ে), নইলে ১ ঘণ্টা পর সিঙ্ক থেমে যাবে।',
          )
        }
        void load()
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Google সংযোগ সেভ করা যায়নি — আবার চেষ্টা করুন।',
        )
      })
    // সেশনে তাজা access token থাকলে সার্ভারের কপিটা তাজা করা।
    void refreshStoredAccessToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller])

  async function runAction(action: () => Promise<void>, doneMsg: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(doneMsg)
      await load()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'কাজটা করা যায়নি।',
      )
    } finally {
      setBusy(false)
    }
  }

  const connected = Boolean(connection)
  const hasSheet = Boolean(connection?.sheet_id)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold">Google Sheets</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        প্রতিটা অর্ডার আপনার নিজের Google Sheet-এ নিজে থেকে যাবে — সেদিনের
        তারিখের আলাদা ট্যাবে। Google যুক্ত না করলে অর্ডার শুধু এখানেই
        থাকবে, Sheet-এ যাবে না।
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">লোড হচ্ছে…</p>
      ) : (
        <>
          {error ? (
            <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 rounded bg-green-50 px-4 py-3 text-sm text-green-800">
              {message}
            </p>
          ) : null}

          {!connected ? (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                এখনো কোনো Google অ্যাকাউন্ট যুক্ত করা হয়নি।
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => connectGoogleSheets(),
                    'Google-এ যাচ্ছে… অনুমতি দিলে ফিরে আসবেন।',
                  )
                }
                className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Google অ্যাকাউন্ট যুক্ত করুন
              </button>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Google-এর অনুমতির পাতায় আপনার Sheet-এর জন্য অনুমতি দিতে
                হবে। "Google যাচাই করেনি" সতর্কতা এলে Advanced → এগিয়ে যান।
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Google অ্যাকাউন্ট: </span>
                  <span className="font-semibold">
                    {connection?.google_email ?? '—'}
                  </span>
                </p>
                {hasSheet ? (
                  <p>
                    <span className="text-gray-500">Sheet: </span>
                    <a
                      href={connection?.sheet_url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-dark underline"
                    >
                      শিট খুলুন ↗
                    </a>
                  </p>
                ) : (
                  <p className="text-gray-600">
                    Sheet এখনো বাছা হয়নি — নিচে নতুন Sheet বানান বা আগের
                    Sheet-এর লিংক দিন।
                  </p>
                )}
              </div>

              {!hasSheet ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(
                          () =>
                            setupSheet('create', {
                              shopName: shopName ?? undefined,
                            }).then(() => undefined),
                          'নতুন Sheet বানানো হয়েছে — আগের অর্ডারগুলোও সিঙ্ক হচ্ছে।',
                        )
                      }
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? 'বানানো হচ্ছে…' : 'নতুন Sheet বানান'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">
                      আগের Sheet-এর লিংক
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/…"
                        className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={busy || !linkUrl.trim()}
                        onClick={() =>
                          void runAction(
                            () =>
                              setupSheet('link', {
                                sheetUrl: linkUrl.trim(),
                              }).then(() => undefined),
                            'Sheet যুক্ত হয়েছে — আগের অর্ডারগুলোও সিঙ্ক হচ্ছে।',
                          )
                        }
                        className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        যাচাই করে যুক্ত করুন
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      লিংকের Sheet-টি খুলতে না পারলে নতুন Sheet বানান —
                      শুধু লিংক পেস্ট করলে সব Sheet খোলে না।
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                {!confirmDisconnect ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(true)}
                    className="text-sm font-semibold text-red-600 underline"
                  >
                    Google সংযোগ ছিন্ন করুন
                  </button>
                ) : (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm">
                    <p className="text-red-800">
                      সংযোগ ছিন্ন করলে আর অর্ডার Sheet-এ যাবে না। Sheet-এর
                      ভেতরের সারি থেকে যাবে, Sheet নিজে মোছা হবে না।
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            () =>
                              disconnectSheet().then(() => {
                                setConfirmDisconnect(false)
                                setLinkUrl('')
                              }),
                            'Google সংযোগ ছিন্ন হয়েছে।',
                          )
                        }
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        হ্যাঁ, ছিন্ন করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDisconnect(false)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                      >
                        ফিরে যান
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* সিঙ্কের অবস্থা — আসল সংখ্যা */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="font-bold">সিঙ্কের অবস্থা</h3>
            {summary ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">সিঙ্ক হয়েছে</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {formatCountBn(summary.synced)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">অপেক্ষায়</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {formatCountBn(summary.pending)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">ব্যর্থ</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {formatCountBn(summary.failed)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">শেষ সিঙ্ক</p>
                  <p className="mt-1 text-sm font-bold">
                    {summary.lastSyncedAt
                      ? formatDateTime(summary.lastSyncedAt)
                      : 'এখনো হয়নি'}
                  </p>
                </div>
              </div>
            ) : null}
            {summary && summary.failed > 0 && seller ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  setError('')
                  setMessage('')
                  retryFailedSyncs(seller.id)
                    .then((r) => {
                      setMessage(
                        `${formatCountBn(r.processed)}টি আবার চেষ্টা করা হয়েছে — ${formatCountBn(r.synced)}টি সিঙ্ক হয়েছে।`,
                      )
                      return load()
                    })
                    .catch((err: unknown) => {
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'রিট্রাই করা যায়নি।',
                      )
                    })
                    .finally(() => setBusy(false))
                }}
                className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                ব্যর্থ সিঙ্ক আবার চেষ্টা করুন
              </button>
            ) : null}
            {summary && summary.notConnected > 0 && !connected ? (
              <p className="mt-3 text-sm text-gray-600">
                {formatCountBn(summary.notConnected)}টি অর্ডার Sheet-এ
                যায়নি — Google যুক্ত করলেই সেগুলো সিঙ্ক হবে।
              </p>
            ) : null}
          </div>

          {/* সিঙ্কের ইতিহাস */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="font-bold">সিঙ্কের ইতিহাস</h3>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                এখনো কোনো সিঙ্কের চেষ্টা হয়নি।
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-start justify-between gap-2 text-sm"
                  >
                    <span>
                      <span className="font-semibold">
                        {ev.order_code ?? ev.order_id.slice(0, 8)}
                      </span>{' '}
                      — {EVENT_STATUS_BN[ev.status] ?? ev.status}
                      {ev.attempts > 1
                        ? ` (${formatCountBn(ev.attempts)} বার চেষ্টা)`
                        : ''}
                      {ev.last_error ? (
                        <span className="block text-xs text-red-600">
                          {ev.last_error}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDateTime(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* সমস্যার সমাধান */}
          <details className="mt-6 border-t border-gray-100 pt-4">
            <summary className="cursor-pointer font-bold">
              সমস্যার সমাধান
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600">
              <li>
                <span className="font-semibold text-gray-800">
                  অর্ডার Sheet-এ আসছে না:
                </span>{' '}
                প্রথমে দেখুন Google যুক্ত আছে কি না আর Sheet বাছা আছে কি
                না। ব্যর্থ থাকলে "ব্যর্থ সিঙ্ক আবার চেষ্টা করুন" চাপুন —
                ব্যর্থ হলে ৩০ মিনিট পর নিজে থেকেও আবার চেষ্টা হয়।
              </li>
              <li>
                <span className="font-semibold text-gray-800">
                  "Google সংযোগের মেয়াদ শেষ হয়েছে":
                </span>{' '}
                আবার "Google অ্যাকাউন্ট যুক্ত করুন" চাপুন — নতুন করে
                অনুমতি দিলেই সিঙ্ক আবার চলবে।
              </li>
              <li>
                <span className="font-semibold text-gray-800">
                  লিংকের Sheet খুলছে না:
                </span>{' '}
                শুধু লিংক পেস্ট করলে সব Sheet খোলে না — "নতুন Sheet
                বানান" ব্যবহার করুন, সেটাই নির্ভরযোগ্য।
              </li>
              <li>
                <span className="font-semibold text-gray-800">
                  একই অর্ডার দুবার আসবে কি?
                </span>{' '}
                না — Order ID (OL-1001…) দেখে ডুপ্লিকেট আটকানো হয়, একই
                অর্ডারের সারি একবারই যোগ হয়।
              </li>
              <li>
                <span className="font-semibold text-gray-800">
                  প্রতিদিনের ট্যাব:
                </span>{' '}
                প্রতিটা দিনের অর্ডার তারিখের নামের আলাদা ট্যাবে যায় (যেমন
                2026-11-27) — পুরনো দিনের ট্যাব আগের মতোই থাকে।
              </li>
            </ul>
          </details>
        </>
      )}
    </div>
  )
}
