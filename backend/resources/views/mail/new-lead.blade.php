<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nouveau lead {{ $lead->reference }}</title>
</head>
{{-- Inline styles and a table layout: mail clients strip <style> blocks and
     most of modern CSS, Gmail and Outlook first among them. --}}
<body style="margin:0;padding:0;background:#f5f2ef;font-family:Arial,Helvetica,sans-serif;color:#3a342d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ef;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
    <tr>
        <td style="background:#a17c45;padding:20px 24px;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85;">Nouveau lead</div>
            <div style="font-size:20px;font-weight:bold;margin-top:4px;">{{ $lead->service->label() }}</div>
        </td>
    </tr>
    <tr>
        <td style="padding:20px 24px 8px;font-size:14px;color:#6b6259;">
            <strong style="color:#3a342d;">{{ $lead->reference }}</strong>
            @if ($receivedAt) · reçu le {{ $receivedAt }} @endif
        </td>
    </tr>
    <tr>
        <td style="padding:0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                @foreach ($rows as $label => $value)
                <tr>
                    <td valign="top" style="padding:8px 12px 8px 0;border-bottom:1px solid #eee8e2;color:#6b6259;white-space:nowrap;width:1%;">{{ $label }}</td>
                    <td valign="top" style="padding:8px 0;border-bottom:1px solid #eee8e2;white-space:pre-line;word-break:break-word;">{{ $value }}</td>
                </tr>
                @endforeach
            </table>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding:24px;">
            <a href="{{ $url }}" style="display:inline-block;background:#a17c45;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:6px;">Ouvrir dans le back-office</a>
        </td>
    </tr>
    <tr>
        <td style="padding:0 24px 20px;font-size:12px;color:#8a8178;text-align:center;">
            Répondre à cet e-mail écrit directement à {{ $lead->email }}.
        </td>
    </tr>
</table>
</td></tr>
</table>
</body>
</html>
