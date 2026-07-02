document.addEventListener('DOMContentLoaded', () => {
    const gridItems = Array.from(document.querySelectorAll('.gallery-item'));
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-btn');

    if (!lightbox) return; 
    
    // Add navigation buttons
    const prevBtn = document.createElement('span');
    prevBtn.innerHTML = '&#10094;';
    prevBtn.className = 'nav-btn prev-btn';
    
    const nextBtn = document.createElement('span');
    nextBtn.innerHTML = '&#10095;';
    nextBtn.className = 'nav-btn next-btn';
    
    lightbox.appendChild(prevBtn);
    lightbox.appendChild(nextBtn);

    let currentIndex = -1;

    function showImage(index) {
        if (index < 0) index = gridItems.length - 1;
        if (index >= gridItems.length) index = 0;
        currentIndex = index;
        const fullSrc = gridItems[currentIndex].getAttribute('data-full');
        lightboxImg.src = fullSrc;
    }

    gridItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            showImage(index);
            lightbox.classList.add('active');
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        setTimeout(() => {
            if (!lightbox.classList.contains('active')) {
                lightboxImg.src = '';
            }
        }, 500); // match transition time
    };

    closeBtn.addEventListener('click', closeLightbox);
    
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentIndex - 1);
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentIndex + 1);
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === lightboxImg) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            showImage(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            showImage(currentIndex + 1);
        }
    });
});
