import { QrWorkspace } from "@/components/crm/qr-workspace";

/**
 * QR codes — for the site, and for the client sheet used at trade shows.
 *
 * Its own section rather than a menu in the board: it is used when a flyer or a
 * stand is being prepared, not while leads are being worked, and it has nothing
 * to do with any one of them.
 */
export default function QrCodesPage() {
  return <QrWorkspace />;
}
