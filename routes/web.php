<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\PeopleController;
use App\Http\Controllers\PortalLaunchController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'login'));

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.store');
});

Route::get('/auth/portal/launch', [PortalLaunchController::class, 'launch'])->name('portal.launch');

Route::middleware(['auth', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/people', [PeopleController::class, 'index'])->name('people.index');

    Route::get('/leaves', [LeaveController::class, 'index'])->name('leaves.index');
    Route::post('/leaves', [LeaveController::class, 'store'])->name('leaves.store');
    Route::post('/leaves/{leave}/confirm', [LeaveController::class, 'confirm'])->name('leaves.confirm');
    Route::post('/leaves/{leave}/cancel', [LeaveController::class, 'cancel'])->name('leaves.cancel');
    Route::post('/leaves/{leave}/void', [LeaveController::class, 'void'])->name('leaves.void');

    Route::middleware('can:manage-integrations')->group(function () {
        Route::get('/integrations', [IntegrationController::class, 'index'])->name('integrations.index');
        Route::post('/integrations/special/master-data/sync', [IntegrationController::class, 'syncMasterData'])->name('integrations.special.master-data.sync');
        Route::post('/integrations/special/leave-snapshots', [IntegrationController::class, 'createAndSendSnapshot'])->name('integrations.special.leave-snapshots.store');
        Route::post('/integrations/special/leave-snapshots/{batch}/send', [IntegrationController::class, 'sendSnapshot'])->name('integrations.special.leave-snapshots.send');
    });
});
