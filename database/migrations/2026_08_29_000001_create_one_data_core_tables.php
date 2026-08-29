<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->string('status', 32)->default('ACTIVE')->index();
            $table->string('source_system', 64)->nullable();
            $table->string('source_id', 191)->nullable()->index();
            $table->json('source_payload')->nullable();
            $table->timestamps();
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('affiliation_id')->constrained('affiliations')->restrictOnDelete();
            $table->string('code', 64);
            $table->string('name');
            $table->string('status', 32)->default('ACTIVE')->index();
            $table->string('source_system', 64)->nullable();
            $table->string('source_id', 191)->nullable()->index();
            $table->string('source_code', 191)->nullable();
            $table->json('source_payload')->nullable();
            $table->timestamps();

            $table->unique(['affiliation_id', 'code']);
            $table->unique(['source_system', 'source_id']);
        });

        Schema::create('persons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 64)->nullable();
            $table->string('first_name', 150);
            $table->string('last_name', 150)->default('');
            $table->string('position_name', 150)->nullable();
            $table->string('position_group', 80)->nullable();
            $table->date('employment_start_date')->nullable();
            $table->date('government_service_start_date')->nullable();
            $table->string('employment_type', 80)->nullable();
            $table->string('status', 32)->default('ACTIVE')->index();
            $table->string('source_system', 64)->nullable();
            $table->string('source_id', 191)->nullable()->index();
            $table->timestamp('source_updated_at')->nullable();
            $table->json('source_payload')->nullable();
            $table->timestamps();

            $table->unique(['source_system', 'source_id']);
            $table->index(['last_name', 'first_name']);
        });

        Schema::create('tenant_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignUuid('person_id')->constrained('persons')->restrictOnDelete();
            $table->string('membership_role', 64)->default('STAFF');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->boolean('is_primary')->default(true);
            $table->string('source_system', 64)->nullable();
            $table->string('source_id', 191)->nullable();
            $table->json('source_payload')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'starts_on', 'ends_on']);
            $table->index(['person_id', 'starts_on', 'ends_on']);
            $table->unique(['tenant_id', 'person_id', 'starts_on']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('person_id')->references('id')->on('persons')->nullOnDelete();
        });

        Schema::create('user_tenant_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->string('role', 64)->default('HEALTH_CENTER_USER');
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'tenant_id']);
            $table->index(['tenant_id', 'role']);
        });

        Schema::create('external_id_mappings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('system', 64);
            $table->string('entity_type', 64);
            $table->string('local_id', 191);
            $table->string('external_id', 191);
            $table->string('external_type', 64)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['system', 'entity_type', 'local_id']);
            $table->unique(['system', 'entity_type', 'external_id']);
        });

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('person_id')->constrained('persons')->restrictOnDelete();
            $table->foreignUuid('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->string('leave_type', 64)->index();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->decimal('duration_days', 5, 1)->nullable();
            $table->text('reason')->nullable();
            $table->string('status', 32)->default('DRAFT')->index();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'starts_on', 'ends_on']);
            $table->index(['person_id', 'status']);
        });

        Schema::create('leave_revisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('leave_request_id')->constrained('leave_requests')->restrictOnDelete();
            $table->unsignedInteger('revision_no');
            $table->string('change_type', 32)->default('CREATED');
            $table->json('snapshot');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['leave_request_id', 'revision_no']);
        });

        Schema::create('leave_export_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('affiliation_id')->constrained('affiliations')->restrictOnDelete();
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month');
            $table->unsignedInteger('snapshot_version')->default(1);
            $table->string('status', 32)->default('PENDING')->index();
            $table->string('idempotency_key', 191)->unique();
            $table->string('source_cutoff', 64)->nullable();
            $table->string('source_hash', 128)->nullable();
            $table->unsignedInteger('item_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->string('external_batch_id', 191)->nullable();
            $table->json('response_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(
                ['affiliation_id', 'period_year', 'period_month', 'snapshot_version'],
                'leave_export_batches_scope_version_unique'
            );
        });

        Schema::create('leave_export_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('batch_id')->constrained('leave_export_batches')->restrictOnDelete();
            $table->foreignUuid('leave_request_id')->constrained('leave_requests')->restrictOnDelete();
            $table->foreignUuid('person_id')->constrained('persons')->restrictOnDelete();
            $table->string('external_employee_id', 191)->nullable();
            $table->string('external_leave_type', 64);
            $table->json('payload');
            $table->string('source_hash', 128);
            $table->timestamps();

            $table->unique(['batch_id', 'leave_request_id']);
            $table->index(['external_employee_id', 'external_leave_type'], 'leave_items_employee_type_idx');
        });

        Schema::create('integration_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('batch_id')->constrained('leave_export_batches')->restrictOnDelete();
            $table->string('system', 64);
            $table->string('operation', 64);
            $table->string('status', 32)->index();
            $table->unsignedInteger('attempt')->default(1);
            $table->string('request_id', 191)->nullable()->index();
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignUuid('affiliation_id')->nullable()->constrained('affiliations')->nullOnDelete();
            $table->string('action', 120)->index();
            $table->string('entity_type', 80)->index();
            $table->string('entity_id', 191)->nullable()->index();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->json('metadata')->nullable();
            $table->string('correlation_id', 191)->nullable()->index();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('outbox_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_type', 120)->index();
            $table->string('aggregate_type', 80);
            $table->string('aggregate_id', 191);
            $table->json('payload');
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('available_at')->nullable()->index();
            $table->timestamp('processed_at')->nullable()->index();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['aggregate_type', 'aggregate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbox_events');
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('integration_deliveries');
        Schema::dropIfExists('leave_export_items');
        Schema::dropIfExists('leave_export_batches');
        Schema::dropIfExists('leave_revisions');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('external_id_mappings');
        Schema::dropIfExists('user_tenant_memberships');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['person_id']);
        });
        Schema::dropIfExists('tenant_memberships');
        Schema::dropIfExists('persons');
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('affiliations');
    }
};
