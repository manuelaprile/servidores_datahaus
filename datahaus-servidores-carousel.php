<?php
/**
 * Plugin Name: Landing Servidores
 * Description: Plugin para la nueva landing de servidores de Datahaus
 * Version: 1.0.0
 * Author: Tupaca
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DATAHAUS_PLUGIN_URL', plugin_dir_url(__FILE__));

class Datahaus_Servidores_Landing {
    
    private $carousel_instances = [];
    
    public function __construct() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_shortcode('datahaus_landing', [$this, 'render_shortcode']);
        add_action('wp_footer', [$this, 'render_scripts']);
        add_action('wp_ajax_datahaus_get_servidor_specs', [$this, 'ajax_get_specs']);
        add_action('wp_ajax_nopriv_datahaus_get_servidor_specs', [$this, 'ajax_get_specs']);
    }
    
    public function enqueue_assets() {
        wp_enqueue_style('datahaus-swiper', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css');
        wp_enqueue_script('datahaus-swiper-js', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js', [], null, true);
        
        wp_enqueue_style('datahaus-styles', DATAHAUS_PLUGIN_URL . 'assets/css/styles.css', [], '1.0.0');
        wp_enqueue_script('datahaus-main', DATAHAUS_PLUGIN_URL . 'assets/js/main.js', ['datahaus-swiper-js', 'jquery'], '1.0.0', true);
        
        wp_localize_script('datahaus-main', 'datahaus_ajax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('datahaus_specs_nonce'),
            'whatsapp_number' => get_option('datahaus_whatsapp_number', '5491112345678')
        ]);
    }
    
    public function render_shortcode($atts) {
        $atts = shortcode_atts(['categoria' => '', 'posts_per_slide' => -1], $atts);
        
        $categorias = get_terms([
            'taxonomy' => 'categoria',
            'hide_empty' => true,
            'slug' => $atts['categoria'] ? $atts['categoria'] : ''
        ]);
        
        if (empty($categorias)) {
            return '<p>No se encontraron categorías.</p>';
        }
        
        ob_start();
        echo '<div class="datahaus-servidores-carousels">';
        
        foreach ($categorias as $categoria) {
            $this->render_categoria($categoria, $atts['posts_per_slide']);
        }
        
        echo '</div>';
        $this->render_detail_view();
        
        return ob_get_clean();
    }
    
    private function render_categoria($categoria, $posts_per_page) {
        $servidores = new WP_Query([
            'post_type' => 'servidor',
            'posts_per_page' => $posts_per_page,
            'tax_query' => [[
                'taxonomy' => 'categoria',
                'field' => 'term_id',
                'terms' => $categoria->term_id,
            ]],
        ]);
        
        if (!$servidores->have_posts()) return;
        
        $this->carousel_instances[] = $categoria->slug;
        
        echo '<div class="datahaus-categoria-section">';
        echo '<h3 class="datahaus-categoria-title">' . esc_html($categoria->name) . '</h3>';
        echo '<div class="swiper datahaus-servidor-carousel" data-carousel="' . $categoria->slug . '">';
        echo '<div class="swiper-wrapper">';
        
        while ($servidores->have_posts()) {
            $servidores->the_post();
            echo '<div class="swiper-slide datahaus-servidor-item">';
            echo '<div class="datahaus-servidor-content">';
            
            if (has_post_thumbnail()) {
                echo '<div class="datahaus-servidor-image">' . get_the_post_thumbnail(get_the_ID(), 'medium') . '</div>';
            }
            
            echo '<h4 class="datahaus-servidor-title">' . get_the_title() . '</h4>';
            echo '<button class="datahaus-servidor-ver-mas" data-servidor-id="' . get_the_ID() . '">Ver más</button>';
            echo '</div></div>';
        }
        
        echo '</div>';
        echo '<div class="swiper-pagination"></div>';
        echo '<div class="swiper-button-next"></div>';
        echo '<div class="swiper-button-prev"></div>';
        echo '</div></div>';
        
        wp_reset_postdata();
    }
    
    private function render_detail_view() {
        ?>
        <div id="datahaus-detail-view" class="datahaus-detail-view" style="display: none;">
            <div class="datahaus-detail-banner">
                <button class="datahaus-back-btn">&larr; Volver</button>
                <div class="datahaus-detail-content">
                    <div class="datahaus-detail-image">
                        <img id="datahaus-detail-img" src="" alt="">
                    </div>
                    <div class="datahaus-detail-info">
                        <h2 id="datahaus-detail-title"></h2>
                        <div id="datahaus-detail-description"></div>
                    </div>
                </div>
            </div>
            <div class="datahaus-detail-specs">
                <div id="datahaus-specs-loading">Cargando especificaciones...</div>
                <div id="datahaus-specs-content"></div>
                <div class="datahaus-cotizar-section">
                    <button id="datahaus-cotizar-btn" class="datahaus-cotizar-btn">Cotizar ahora</button>
                </div>
            </div>
        </div>
        <?php
    }
    
public function ajax_get_specs() {
    check_ajax_referer('datahaus_specs_nonce', 'nonce');
    
    $servidor_id = intval($_POST['servidor_id']);
    if (!$servidor_id) wp_die('ID inválido');
    
    $response = [
        'titulo' => get_the_title($servidor_id),
        'imagen' => get_the_post_thumbnail_url($servidor_id, 'large'),
        'descripcion' => get_the_excerpt($servidor_id),
        'specs' => []
    ];
    
    //La nomenclatura es la siguiente nombre del campo en ACF -> Label -> Tipo de campo
    $spec_config = [
        'chasis' => ['label' => 'Chasis', 'type' => 'radio'],
        'procesador' => ['label' => 'Procesadores', 'type' => 'radio'],
        'memoria_ram' => ['label' => 'Memorias RAM', 'type' => 'quantity'],
        'disco_ssd' => ['label' => 'Discos SSD', 'type' => 'quantity']
    ];
    
    foreach ($spec_config as $field_name => $config) {
        $field_data = get_field($field_name, $servidor_id);
                
        if ($field_data && is_array($field_data)) {
            $response['specs'][$field_name] = [
                'label' => $config['label'],
                'options' => $field_data,
                'type' => $config['type']
            ];
        }
    }
    
    wp_send_json_success($response);
}
    
    public function render_scripts() {
        if (!empty($this->carousel_instances)) {
            echo '<script>
                document.addEventListener("DOMContentLoaded", function() {
                    if (typeof DatahausServidores !== "undefined") {
                        DatahausServidores.init(' . json_encode($this->carousel_instances) . ');
                    }
                });
            </script>';
        }
    }
}

new Datahaus_Servidores_Landing();