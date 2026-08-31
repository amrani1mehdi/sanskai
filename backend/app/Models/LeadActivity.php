<?php

namespace App\Models;

use App\Enums\ActivityKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['kind', 'label', 'actor_id', 'actor_name'])]
class LeadActivity extends Model
{
    protected function casts(): array
    {
        return ['kind' => ActivityKind::class];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
