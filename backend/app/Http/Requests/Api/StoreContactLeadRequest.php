<?php

namespace App\Http\Requests\Api;

/**
 * Validation for the /contact form.
 *
 * The same form as /financement, field for field, because that is literally
 * what the contact page renders now — it used to ask a much lighter set
 * (company, name, email, a message and any invoices) on the reasoning that
 * somebody writing in is asking a question rather than opening a dossier.
 *
 * Extended rather than copied so the two cannot drift: a field added to the
 * financing form is a field the contact form asks for the same day, and a
 * second list of rules would be wrong the first time one of them changed.
 *
 * What differs is not the payload but where it lands — see
 * `WebsiteLeadController::contact()`, which files it under the Contact service
 * with a CON- reference.
 */
class StoreContactLeadRequest extends StoreFinancingLeadRequest
{
}
