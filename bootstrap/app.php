<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [HandleInertiaRequests::class]);
        $middleware->alias(['active' => EnsureActiveUser::class]);
    })
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('special:sync-master-data')
            ->dailyAt('02:00')
            ->withoutOverlapping()
            ->when(fn (): bool => (bool) config('onedata.scheduled_master_sync', false));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
