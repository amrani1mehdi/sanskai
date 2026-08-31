<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Validator;

/**
 * Adds an administrator, or promotes an existing account to one.
 *
 * The seeder creates the single account named in `config('leads.admin')` and
 * nothing else, and there is no endpoint or panel screen that makes a second
 * one — the `users` table has carried `is_admin` all along with no way to set
 * it on anybody new. This is that way.
 *
 *     php artisan admin:create --email=someone@sansekaisolution.com --name="Someone"
 *
 * The password is asked for, not passed as an argument: an argument is in the
 * shell history and in `ps` output for every other tenant on the box to read.
 * For an unattended run — a deploy script — set ADMIN_NEW_PASSWORD instead, and
 * the same reasoning applies to keeping that out of a committed file.
 */
class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create
                            {--email= : The address they will sign in with}
                            {--name= : Their display name}';

    protected $description = 'Create an administrator, or promote an existing account';

    public function handle(): int
    {
        $email = $this->option('email') ?: $this->ask('Email address');
        $name = $this->option('name') ?: $this->ask('Full name');

        $check = Validator::make(
            ['email' => $email, 'name' => $name],
            [
                'email' => ['required', 'email:rfc', 'max:190'],
                'name' => ['required', 'string', 'max:190'],
            ],
        );

        if ($check->fails()) {
            foreach ($check->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $email = mb_strtolower(trim($email));
        $existing = User::where('email', $email)->first();

        /*
         * Promoting someone who is already here is the common case for a
         * colleague who was added for the Filament panel: say so, rather than
         * appearing to have created a second account.
         */
        if ($existing?->is_admin) {
            $this->info("{$email} is already an administrator.");

            return self::SUCCESS;
        }

        $password = $this->password($existing !== null);

        if ($password === null) {
            return self::FAILURE;
        }

        /*
         * Assigned one by one, not through updateOrCreate().
         *
         * The model declares #[Fillable(['name', 'email', 'password'])], so
         * mass assignment drops `is_admin` without a word — the account is
         * created, the command reports success, and the person still cannot
         * reach the panel. Setting the property directly bypasses that guard,
         * which is the point: granting exactly this flag is what the command
         * is for.
         */
        $user = User::firstOrNew(['email' => $email]);

        $user->name = $name;
        $user->is_admin = true;
        $user->email_verified_at ??= now();

        if ($password !== '') {
            $user->password = Hash::make($password);
        }

        $user->save();

        $this->info(
            $existing
                ? "{$email} was promoted to administrator."
                : "{$email} was created as an administrator.",
        );

        return self::SUCCESS;
    }

    /**
     * The new password, '' to leave an existing one alone, or null to stop.
     *
     * Never invented: a generated password nobody writes down is a lockout, and
     * one hardcoded anywhere is a back door for whoever reads the file.
     */
    private function password(bool $userExists): ?string
    {
        /*
         * getenv(), not env(): the server runs `config:cache`, after which
         * Laravel's env() reads null everywhere outside a config file — the
         * same trap AdminUserSeeder documents. getenv() asks the process
         * environment, which is where `ADMIN_NEW_PASSWORD=... php artisan`
         * actually puts it, cached config or not.
         */
        $fromEnvironment = getenv('ADMIN_NEW_PASSWORD') ?: null;

        if (filled($fromEnvironment)) {
            return $this->validated($fromEnvironment);
        }

        if (! $this->input->isInteractive()) {
            $this->error(
                'No password given. Set ADMIN_NEW_PASSWORD for an unattended run.',
            );

            return null;
        }

        if ($userExists && ! $this->confirm('Set a new password for this account?', false)) {
            // Promoting someone who already signs in should not disturb the
            // password they already use.
            return '';
        }

        $entered = $this->secret('Password');
        $again = $this->secret('Confirm password');

        if ($entered !== $again) {
            $this->error('The two passwords do not match.');

            return null;
        }

        return $this->validated((string) $entered);
    }

    /** Applies the framework's default strength rules, or stops. */
    private function validated(string $password): ?string
    {
        $check = Validator::make(
            ['password' => $password],
            ['password' => ['required', Password::default()]],
        );

        if ($check->fails()) {
            foreach ($check->errors()->all() as $message) {
                $this->error($message);
            }

            return null;
        }

        return $password;
    }
}
