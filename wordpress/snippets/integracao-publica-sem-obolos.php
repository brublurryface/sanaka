<?php
/**
 * Snippet #6 após instalar Óbolos de Sanaka 1.1.0.
 * No Code Snippets, omita a primeira linha "<?php".
 * Preserva os campos editoriais; o plugin assume somente o domínio dos óbolos.
 */
add_action('rest_api_init', static function (): void {
    foreach ([
        'hover_text' => ['Texto exibido no hover do post.', 'sanitize_textarea_field', null],
        'sanakaverse_cover' => ['URL da composição quadrada usada como capa em Sanaka-loka.', 'esc_url_raw', 'uri'],
    ] as $name => [$description, $sanitize, $format]) {
        $schema = ['description' => $description, 'type' => 'string', 'context' => ['view']];
        if ($format !== null) {
            $schema['format'] = $format;
        }
        register_rest_field('post', $name, [
            'get_callback' => static function (array $post) use ($name, $sanitize): string {
                $value = get_post_meta($post['id'], $name, true);
                return is_scalar($value) ? (string) $sanitize((string) $value) : '';
            },
            'schema' => $schema,
        ]);
    }
});
