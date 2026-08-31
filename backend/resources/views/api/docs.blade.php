<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>API CRM — Sansekai Solution</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
    <style>body { margin: 0; }</style>
</head>
<body>
    <div id="swagger"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
        window.ui = SwaggerUIBundle({
            // Root-relative on purpose: an absolute route() URL is built from
            // APP_URL, which points at whatever host the app thinks it is — and
            // when that disagrees with the host actually serving this page, the
            // browser blocks the fetch as cross-origin.
            url: '/api/docs/openapi.yaml',
            dom_id: '#swagger',
            deepLinking: true,
            persistAuthorization: true,
        });
    </script>
</body>
</html>
