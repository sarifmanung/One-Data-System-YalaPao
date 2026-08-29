<?php

return [
    'default_affiliation_code' => env('ONEDATA_DEFAULT_AFFILIATION_CODE', 'YALA-PAO'),
    'local_login_enabled' => env('ONEDATA_LOCAL_LOGIN_ENABLED', true),
    'scheduled_master_sync' => filter_var(env('ONEDATA_SCHEDULED_MASTER_SYNC', false), FILTER_VALIDATE_BOOL),
    'special' => [
        'base_url' => env('SPECIAL_ALLOWANCES_BASE_URL'),
        'integration_token' => env('SPECIAL_ALLOWANCES_INTEGRATION_TOKEN'),
        'timeout' => (int) env('SPECIAL_ALLOWANCES_TIMEOUT', 15),
        'dry_run' => filter_var(env('SPECIAL_ALLOWANCES_DRY_RUN', true), FILTER_VALIDATE_BOOL),
    ],
    'portal' => [
        'shared_secret' => env('PORTAL_SHARED_SECRET'),
        'audience' => env('ONEDATA_PORTAL_AUDIENCE', 'one_data'),
        'issuer' => env('ONEDATA_PORTAL_ISSUER'),
    ],
];
