<?php

return [
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
        'email' => env('ADMIN_EMAIL', 'admin@sansekaisolution.com'),
        'password' => env('ADMIN_PASSWORD'),
    ],
];
