<?php

use App\Http\Controllers\ApiController;
use Illuminate\Support\Facades\Route;

Route::get('/v1/health', [ApiController::class, 'health'])->name('api.health');

Route::middleware(['auth', 'active'])->prefix('v1')->group(function () {
    Route::get('/me', [ApiController::class, 'me'])->name('api.me');
    Route::get('/people', [ApiController::class, 'people'])->name('api.people');
    Route::get('/leaves', [ApiController::class, 'leaves'])->name('api.leaves');

    Route::middleware('can:manage-integrations')->group(function () {
        Route::post('/integrations/special/master-data/sync', [ApiController::class, 'syncMasterData'])->name('api.special.master-data.sync');
        Route::post('/integrations/special/leave-snapshots', [ApiController::class, 'createAndSendSnapshot'])->name('api.special.leave-snapshots.store');
        Route::get('/integrations/special/leave-snapshots/{batch}', [ApiController::class, 'showSnapshot'])->name('api.special.leave-snapshots.show');
        Route::post('/integrations/special/leave-snapshots/{batch}/send', [ApiController::class, 'sendSnapshot'])->name('api.special.leave-snapshots.send');
    });
});
