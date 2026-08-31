<?php

return [
    /*
     * Shared secret the website sends as `X-Api-Key` when submitting a lead.
     *
     * Server-to-server only: the Next.js route handler holds it, never the
     * browser. Leave it null in local development to allow unauthenticated
     * submissions; a null key in production is refused at boot instead of
     * silently opening the endpoint.
     */
    'website_api_key' => env('WEBSITE_API_KEY'),

    /*
     * Disk for uploaded documents. Must be private — nothing here is served
     * from public storage, so a Kbis cannot be reached by guessing a URL.
     */
    'documents_disk' => env('LEAD_DOCUMENTS_DISK', 'lead_documents'),

    /** Per-file upload ceiling, in kilobytes. Mirrors the website's 10 MB. */
    'max_upload_kb' => 10240,

    /** Accepted upload types, mirroring the website's accept attribute. */
    'accepted_mimes' => ['pdf', 'jpg', 'jpeg', 'png'],

    /*
     * The single administrator, as created by AdminUserSeeder.
     *
     * Declared here rather than read with env() at the point of use: once
     * `config:cache` has run, env() returns null everywhere outside config
     * files, and the seeder would silently decline to create the account. Only
     * config files may read the environment.
     */
    'admin' => [
        'name' => env('ADMIN_NAME', 'Sansekai Admin'),
        'username' => env('ADMIN_USERNAME', 'admin'),
        'email' => env('ADMIN_EMAIL', 'admin@sansekaisolution.com'),
        'password' => env('ADMIN_PASSWORD'),
    ],
];
