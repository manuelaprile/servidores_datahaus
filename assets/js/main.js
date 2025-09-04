let selectedSpecs = {};
let swiperInstances = {};

function initDatahausServidores(carouselIds) {
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper no está disponible');
        return;
    }

    initCarousels(carouselIds);
    bindEvents();
}

// Carousels
function initCarousels(carouselIds) {
    carouselIds.forEach(carouselId => {
        const selector = `.datahaus-servidor-carousel[data-carousel="${carouselId}"]`;
        const carouselElement = jQuery(selector)[0];

        if (carouselElement) {
            createSwiper(carouselElement, carouselId);
        }
    });
}

function createSwiper(element, carouselId) {
    const swiper = new Swiper(element, {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: false,

        navigation: {
            nextEl: element.querySelector('.swiper-button-next'),
            prevEl: element.querySelector('.swiper-button-prev')
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

    element.swiperInstance = swiper;
    swiperInstances[carouselId] = swiper;
    return swiper;
}

// Event listeners
function bindEvents() {
    jQuery(document).on('click', '.datahaus-servidor-ver-mas', function(e) {
        e.preventDefault();
        const servidorId = jQuery(this).data('servidor-id');
        showDetailView(servidorId);
    });

    jQuery(document).on('click', '.datahaus-back-btn', function() {
        hideDetailView();
    });

    jQuery(document).on('click', '.datahaus-spec-header', function() {
        toggleAccordion(jQuery(this));
    });

    jQuery(document).on('change', '.datahaus-spec-option input', function() {
        updateSelectedSpecs();
    });

    jQuery(document).on('click', '#datahaus-cotizar-btn', function() {
        sendToWhatsApp();
    });
}

// Vista de detalle
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
        success: function(response) {
            if (response.success) {
                renderDetailView(response.data);
            } else {
                console.error('Error al cargar especificaciones');
            }
        },
        error: function() {
            console.error('Error de conexión');
        }
    });
}

function hideDetailView() {
    jQuery('#datahaus-detail-view').hide();
    jQuery('.datahaus-servidores-carousels').show();
    selectedSpecs = {};
}

function renderDetailView(data) {
    jQuery('#datahaus-detail-title').text(data.titulo);
    jQuery('#datahaus-detail-img').attr('src', data.imagen);
    jQuery('#datahaus-detail-description').text(data.descripcion);
    jQuery('#datahaus-specs-loading').hide();

    let html = '';
    
    Object.keys(data.specs).forEach(specKey => {
        const spec = data.specs[specKey];
        
        console.log(`=== SPEC: ${specKey} ===`);
        console.log('Spec completo:', spec);
        
        html += `<div class="datahaus-spec-accordion">
            <div class="datahaus-spec-header" data-spec="${specKey}">
                <span>${spec.label}</span>
                <span>▼</span>
            </div>
            <div class="datahaus-spec-content">`;
        
        spec.options.forEach((option, index) => {
            
            const inputId = `${specKey}_${index}`;
            
            html += '<div class="datahaus-spec-option">';            
            const modelo = option[`${specKey}_modelo`] || '';
            const sku = option[`${specKey}_sku`] || '';
            
            let labelText = '';
            if (modelo) {
                labelText += `${modelo}`;
            }
            if (sku) {
                labelText += ` [${sku}]`;
            }
                        
            if (spec.type === 'quantity') {
                html += `<input type="number" name="${inputId}_qty" id="${inputId}_qty" value="0" min="0" max="99" class="datahaus-qty-input">
                         <label for="${inputId}_qty">x ${labelText}</label>`;
            } else {
                const inputName = spec.type === 'radio' ? specKey : `${specKey}[]`;
                html += `<input type="${spec.type}" name="${inputName}" id="${inputId}" value="${index}">
                         <label for="${inputId}">${labelText}</label>`;
            }
            
            html += '</div>';
        });
        
        html += '</div></div>';
    });

    jQuery('#datahaus-specs-content').html(html).show();
    selectedSpecs = {};
}

// Accordion
function toggleAccordion($header) {
    const $content = $header.next('.datahaus-spec-content');
    
    $header.toggleClass('active');
    $content.toggleClass('active');
    
    const icon = $header.hasClass('active') ? '▲' : '▼';
    $header.find('span:last').text(icon);
}

// Selección de especificaciones
function updateSelectedSpecs() {
    selectedSpecs = {};
    
    // Radio buttons y checkboxes
    jQuery('.datahaus-spec-option input:checked').each(function() {
        const $input = jQuery(this);
        const specType = $input.closest('.datahaus-spec-accordion').find('.datahaus-spec-header').data('spec');
        const label = $input.next('label').text();
        
        if (!selectedSpecs[specType]) {
            selectedSpecs[specType] = [];
        }
        selectedSpecs[specType].push(label);
    });
    
    // Campos de cantidad
    jQuery('.datahaus-spec-option input[type="number"]').each(function() {
        const $input = jQuery(this);
        const qty = parseInt($input.val()) || 0;
        
        if (qty > 0) {
            const specType = $input.closest('.datahaus-spec-accordion').find('.datahaus-spec-header').data('spec');
            const label = $input.next('label').text();
            
            if (!selectedSpecs[specType]) {
                selectedSpecs[specType] = [];
            }
            selectedSpecs[specType].push(`${qty} ${label}`);
        }
    });
}

// WhatsApp
function sendToWhatsApp() {
    updateSelectedSpecs();
    
    const serverName = jQuery('#datahaus-detail-title').text();
    let message = `Hola! Me interesa el servidor: ${serverName}\n\n`;
    message += 'Configuración seleccionada:\n';
    
    Object.keys(selectedSpecs).forEach(specType => {
        const specLabel = jQuery(`[data-spec="${specType}"]`).text();
        const specs = selectedSpecs[specType].join(', ');
        message += `• ${specLabel}: ${specs}\n`;
    });
    
    message += '\n¿Podrían enviarme más información?';
    
    const whatsappUrl = `https://wa.me/${datahaus_ajax.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function destroyCarousel(carouselId) {
    const element = jQuery(`.datahaus-servidor-carousel[data-carousel="${carouselId}"]`)[0];
    
    if (element && element.swiperInstance) {
        element.swiperInstance.destroy(true, true);
        element.swiperInstance = null;
        delete swiperInstances[carouselId];
    }
}

function updateCarousel(carouselId) {
    if (swiperInstances[carouselId]) {
        swiperInstances[carouselId].update();
    }
}

// Objeto global para compatibilidad
window.DatahausServidores = {
    init: initDatahausServidores,
    destroy: destroyCarousel,
    update: updateCarousel
};