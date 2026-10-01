{{-- Plain text: unescaped on purpose, or "d'affaires" arrives as "d&#039;affaires". --}}
Nouveau lead · {!! $lead->service->label() !!}
{!! $lead->reference !!}@if ($receivedAt) · reçu le {!! $receivedAt !!}@endif


@foreach ($rows as $label => $value)
{!! $label !!} : {!! $value !!}
@endforeach

Ouvrir dans le back-office : {!! $url !!}

Répondre à cet e-mail écrit directement à {!! $lead->email !!}.
