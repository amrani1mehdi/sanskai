<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the admin account used to sign in to the Filament panel at /admin.
 *
 * Safe to run repeatedly — it updates the existing row rather than adding a
 * duplicate. Set ADMIN_EMAIL / ADMIN_PASSWORD in .env to override the local
 * development defaults; never deploy with the fallback password.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@sansekaisolution.com')],
            [
                'name' => env('ADMIN_NAME', 'Sansekai Admin'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'password')),
                'email_verified_at' => now(),
            ],
        );
    }
}
