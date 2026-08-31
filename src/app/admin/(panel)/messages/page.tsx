import { MessagesView } from "@/components/crm/messages-view";

/**
 * Contact-form messages.
 *
 * Deliberately its own page rather than a filter on /admin/leads: a message is
 * someone writing in, not a service enquiry, and it carries none of the fields
 * the leads table is built around.
 */
export default function MessagesPage() {
  return <MessagesView />;
}
