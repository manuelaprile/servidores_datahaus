document.addEventListener('DOMContentLoaded', function () {
    const container = document.querySelector('[data-init-carousels]');
    if (container) {
        initDatahausServidores();
    }
});

let selectedSpecs = {};

function initDatahausServidores() {
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper no está disponible');
        return;
    }

    initCarousels();
    initRelacionadosSlider();
    bindEvents();
}

function initCarousels() {
    const carousels = document.querySelectorAll('.datahaus-servidor-carousel');

    carousels.forEach(carousel => {
        new Swiper(carousel, {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: false,
            navigation: {
                nextEl: carousel.querySelector('.swiper-button-next'),
                prevEl: carousel.querySelector('.swiper-button-prev')
            },
            breakpoints: {
                480: { slidesPerView: 1, spaceBetween: 15 },
                640: { slidesPerView: 2, spaceBetween: 20 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                1200: { slidesPerView: 3, spaceBetween: 25 }
            },
            speed: 400,
            effect: 'slide',
            autoHeight: false,
        });
    });
}

// ============================================================================
// EVENTS
// ============================================================================
function bindEvents() {
    jQuery(document).on('click', '.datahaus-servidor-ver-mas', function (e) {
        e.preventDefault();
        const servidorId = jQuery(this).data('servidor-id');
        showDetailView(servidorId);
    });

    jQuery(document).on('click', '.datahaus-back-btn', function () {
        hideDetailView();
    });

    jQuery(document).on('click', '.datahaus-spec-header', function () {
        toggleAccordion(jQuery(this));
    });

    jQuery(document).on('change', '.datahaus-spec-option input', function () {
        updateSelectedSpecs();
    });

    jQuery(document).on('click', '#datahaus-cotizar-btn', function () {
        sendToWhatsApp();
    });
}

// ============================================================================
// DETAIL VIEW
// ============================================================================
function showDetailView(servidorId) {
    jQuery('.datahaus-servidores-carousels').hide();
    jQuery('#datahaus-detail-view').show();
    jQuery('#datahaus-specs-loading').show();
    jQuery('#datahaus-specs-content').hide();

    jQuery.ajax({
        url: datahaus_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'datahaus_get_servidor_specs',
            servidor_id: servidorId,
            nonce: datahaus_ajax.nonce
        },
        success: function (response) {
            if (response.success) {
                renderDetailView(response.data);
            } else {
                console.error('Error al cargar especificaciones');
            }
        },
        error: function () {
            console.error('Error de conexión');
        }
    });
}

function hideDetailView() {
    jQuery('#datahaus-detail-view').hide();
    jQuery('.datahaus-servidores-carousels').show();
    selectedSpecs = {};
}

let relacionadosSwiper = null;

function initRelacionadosSlider() {
    if (typeof Swiper !== 'undefined' && !relacionadosSwiper) {
        relacionadosSwiper = new Swiper('#relacionados-detail-slider', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: false,
            navigation: {
                nextEl: '#relacionados-detail-slider .swiper-button-next',
                prevEl: '#relacionados-detail-slider .swiper-button-prev'
            },
            pagination: {
                el: '#relacionados-detail-slider .swiper-pagination',
                clickable: true
            },
            breakpoints: {
                480: { slidesPerView: 1, spaceBetween: 15 },
                640: { slidesPerView: 2, spaceBetween: 20 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                1200: { slidesPerView: 3, spaceBetween: 25 }
            },
            speed: 400,
            effect: 'slide',
            autoHeight: false,
        });
    }
}

function renderDetailView(data) {
    jQuery('#datahaus-detail-title').text(data.titulo);
    jQuery('#datahaus-detail-img').attr('src', data.imagen);
    jQuery('#datahaus-detail-description').text(data.descripcion);
    jQuery('#datahaus-specs-loading').hide();

    const specsHtml = buildSpecsHtml(data.specs);
    jQuery('#datahaus-specs-content').html(specsHtml).show();
    renderServidoresRelacionados(data.relacionados);
    selectedSpecs = {};
}

function renderServidoresRelacionados(relacionados) {
    const container = jQuery('#datahaus-relacionados-container');
    
    if (!relacionados || relacionados.length === 0) {
        container.hide();
        return;
    }
    
    // Mostrar el contenedor
    container.show();
    
    // Asegurar que el slider esté inicializado
    if (!relacionadosSwiper) {
        initRelacionadosSlider();
    }
    
    // Limpiar slides existentes
    if (relacionadosSwiper) {
        relacionadosSwiper.removeAllSlides();
    }
    
    // Crear nuevos slides
    const slides = [];
    relacionados.forEach(servidor => {
        let slideHtml = `
            <div class="datahaus-relacionado-item swiper-slide">
                <div class="datahaus-relacionado-content">`;
        
        if (servidor.imagen) {
            slideHtml += `
                <div class="datahaus-relacionado-image">
                    <img src="${servidor.imagen}" alt="${servidor.titulo}">
                </div>`;
        }
        
        if (servidor.categoria) {
            slideHtml += `
                <div class="datahaus-relacionado-categoria">
                    ${servidor.categoria}
                </div>`;
        }
        
        slideHtml += `
                    <h4 class="datahaus-relacionado-titulo">
                        ${servidor.titulo}
                    </h4>
                    <div class="datahaus-relacionado-excerpt">
                        ${servidor.excerpt}
                    </div>
                    <button class="datahaus-servidor-ver-mas datahaus-relacionado-link" data-servidor-id="${servidor.id}">
                        Ver más
                    </button>
                </div>
            </div>`;
        
        slides.push(slideHtml);
    });
    
    // Agregar slides al slider
    if (relacionadosSwiper) {
        relacionadosSwiper.appendSlide(slides);
        relacionadosSwiper.slideTo(0, 0);
        relacionadosSwiper.update();
    }
}


function buildSpecsHtml(specs) {
    let html = '';

    Object.entries(specs).forEach(([specKey, spec]) => {
        html += `<div class="datahaus-spec-accordion">
            <div class="datahaus-spec-header" data-spec="${specKey}">
                <span class="datahaus-product-name">${spec.label}</span>
                <span>▼</span>
            </div>
            <div class="datahaus-spec-content">`;

        spec.options.forEach((option, index) => {
            html += buildSpecOption(specKey, spec, option, index);
        });

        html += '</div></div>';
    });

    return html;
}

function buildSpecOption(specKey, spec, option, index) {
    const inputId = `${specKey}_${index}`;
    const labelText = buildOptionLabel(option, specKey);

    let optionHtml = '<div class="datahaus-spec-option">';

    if (spec.type === 'quantity') {
        optionHtml += `
            <input type="number" name="${inputId}_qty" id="${inputId}_qty" 
                   value="0" min="0" max="99" class="datahaus-qty-input">
            <label for="${inputId}_qty">x ${labelText}</label>`;
    } else {
        const inputName = spec.type === 'radio' ? specKey : `${specKey}[]`;
        optionHtml += `
            <input type="${spec.type}" name="${inputName}" id="${inputId}" value="${index}">
            <label for="${inputId}">${labelText}</label>`;
    }

    optionHtml += '</div>';
    return optionHtml;
}

function buildOptionLabel(option, specKey) {
    const modelo = option[`${specKey}_modelo`] || '';
    const sku = option[`${specKey}_sku`] || '';

    let labelText = modelo;
    if (sku) {
        labelText += ` [${sku}]`;
    }

    return labelText;
}

// ============================================================================
// ACCORDION
// ============================================================================
function toggleAccordion($header) {
    const $content = $header.next('.datahaus-spec-content');

    $header.toggleClass('active');
    $content.toggleClass('active');

    const icon = $header.hasClass('active') ? '▲' : '▼';
    $header.find('span:last').text(icon);
}

function updateSelectedSpecs() {
    selectedSpecs = {};

    jQuery('.datahaus-spec-option input:checked').each(function () {
        addSpecToSelection(jQuery(this), 'checked');
    });

    jQuery('.datahaus-spec-option input[type="number"]').each(function () {
        const qty = parseInt(jQuery(this).val()) || 0;
        if (qty > 0) {
            addSpecToSelection(jQuery(this), 'quantity', qty);
        }
    });
}

function addSpecToSelection($input, type, qty = null) {
    const specType = $input.closest('.datahaus-spec-accordion')
        .find('.datahaus-spec-header')
        .data('spec');
    const label = $input.next('label').text();

    if (!selectedSpecs[specType]) {
        selectedSpecs[specType] = [];
    }

    const finalLabel = type === 'quantity' ? `${qty} ${label}` : label;
    selectedSpecs[specType].push(finalLabel);
}

// ============================================================================
// WHATSAPP
// ============================================================================
function sendToWhatsApp() {
    updateSelectedSpecs();

    const serverName = jQuery('#datahaus-detail-title').text();
    let message = `Hola! Me interesa el servidor: ${serverName}\n\n`;
    message += 'Configuración seleccionada:\n';

    Object.entries(selectedSpecs).forEach(([specType, specs]) => {
        const specLabel = jQuery(`[data-spec="${specType}"] .datahaus-product-name`).text();
        message += `• ${specLabel}: ${specs.join(', ')}\n`;
    });

    message += '\n¿Podrían enviarme más información?';

    const whatsappUrl = `https://wa.me/${datahaus_ajax.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}