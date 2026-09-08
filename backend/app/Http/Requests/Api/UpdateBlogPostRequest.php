<?php

namespace App\Http\Requests\Api;

use App\Enums\PostStatus;
use App\Models\BlogPost;
use App\Rules\ValidUtf8;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * An edit to an existing article.
 *
 * Everything is optional and only what was sent is applied, so the editor can
 * save one tab — or just flip an article to published — without posting the
 * other two languages back over themselves.
 *
 * `present` rather than `required` on the text fields: a field that is sent
 * must still carry something, but not sending it at all leaves it alone. The
 * difference matters because "" is how a browser sends an emptied textarea, and
 * an article whose German body has been blanked out is the broken page this is
 * here to prevent.
 */
class UpdateBlogPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $rules = [
            'status' => ['sometimes', Rule::enum(PostStatus::class)],
            'publishedAt' => ['sometimes', 'nullable', 'date'],
            'cover' => [
                'sometimes',
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.UploadLimits::maxKilobytes(),
            ],
            // Sent on its own to take the picture off again.
            'removeCover' => ['sometimes', 'boolean'],
        ];

        foreach (BlogPost::LOCALES as $locale) {
            /* See StoreBlogPostRequest: mis-encoded bytes break every listing
               the article appears in, so they are refused at the door. */
            /* A slug that is not sent stays as it is — the controller never
               regenerates a URL the article has already been published at. */
            $rules["slug.{$locale}"] = ['sometimes', 'nullable', 'string', 'max:180', new ValidUtf8];
            $rules["title.{$locale}"] = ['sometimes', 'required', 'string', 'max:180', new ValidUtf8];
            $rules["excerpt.{$locale}"] = ['sometimes', 'nullable', 'string', 'max:400', new ValidUtf8];
            $rules["body.{$locale}"] = ['sometimes', 'required', 'string', 'max:120000', new ValidUtf8];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        $names = ['cover' => 'image de couverture'];
        $labels = ['en' => 'anglais', 'fr' => 'français', 'de' => 'allemand'];

        foreach ($labels as $locale => $label) {
            $names["title.{$locale}"] = "titre ({$label})";
            $names["excerpt.{$locale}"] = "résumé ({$label})";
            $names["body.{$locale}"] = "contenu ({$label})";
        }

        return $names;
    }
}
