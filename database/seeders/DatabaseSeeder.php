<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'One Data Administrator',
                'email' => null,
                'password' => Hash::make((string) env('ONEDATA_SEED_ADMIN_PASSWORD', 'password')),
                'role' => 'ADMIN',
                'is_active' => true,
            ],
        );

        if (app()->environment('local', 'testing')) {
            User::updateOrCreate(
                ['username' => 'demo'],
                [
                    'name' => 'Demo Health Center User',
                    'email' => null,
                    'password' => Hash::make('password'),
                    'role' => 'HEALTH_CENTER_USER',
                    'is_active' => true,
                ],
            );
        }
    }
}
