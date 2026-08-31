<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates the admin account used to sign in to the Filament panel at /admin.
 *
 * Safe to run repeatedly — it updates the existing row rather than adding a
 * duplicate, and leaves the password alone unless ADMIN_PASSWORD is set, so
 * re-seeding never silently resets a password you chose.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // config(), not env(): once the config cache is built, env() reads
        // null outside config files and this would quietly create nothing.
        $email = config('leads.admin.email');
        $password = config('leads.admin.password');

        $existing = User::where('email', $email)->first();

        /*
         * Refuse to invent a password outside local development: a generated
         * one nobody records is a lockout, and a hardcoded one is a back door.
         */
        if (! $existing && blank($password)) {
            if (! app()->environment('local')) {
                $this->command?->error(
                    'ADMIN_PASSWORD is not set. Set it in .env before seeding outside local.',
                );

                return;
            }

            $password = Str::password(20);
            $this->command?->warn('ADMIN_PASSWORD was not set, so one was generated:');
            $this->command?->line("    {$password}");
            $this->command?->warn('Save it now — it is not stored anywhere else.');
        }

        $attributes = [
            'name' => config('leads.admin.name'),
            // Handed to the admin at installation; they sign in with either this
            // or the email, and change the password from the API afterwards.
            'username' => config('leads.admin.username'),
            'is_admin' => true,
            'email_verified_at' => now(),
        ];

        if (filled($password)) {
            $attributes['password'] = Hash::make($password);
        }

        User::updateOrCreate(['email' => $email], $attributes);

        if ($existing && filled($password)) {
            $this->command?->info("Password for {$email} was reset from ADMIN_PASSWORD.");
        }
    }
}
