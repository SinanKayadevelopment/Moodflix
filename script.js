const API_KEY = '84af2e188c3091e92962ad17aa673ced';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NGFmMmUxODhjMzA5MWU5Mjk2MmFkMTdhYTY3M2NlZCIsInNiZiI6MTczNTIzMTE0NS43Miwic3ViIjoiNjc2ZDg2YTk4MjU4Mjk0YmI4NjE0YTQ5Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.z9H4JY0Sh5ZxypBi5ogzydCDFVp9aSOsMMIfPf5xh4g';

const moodGenres = {
    happy: '35',
    sad: '18',
    excited: '28',
    romantic: '10749',
    angry: '28,27',
    scared: '27',
    adventurous: '12',
    mysterious: '9648',
    thoughtful: '878',
    family: '10751'
};

// Tüm filmleri saklayacak bir dizi
let allMovies = [];

async function getMoviesByMood(mood) {
    const loadingElement = document.getElementById('loading');
    const moviesContainer = document.getElementById('movies-container');
    
    loadingElement.classList.remove('hidden');
    moviesContainer.innerHTML = '';
    
    const genreId = moodGenres[mood];
    
    try {
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=tr-TR&sort_by=popularity.desc&page=1`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            await displayMovies(data.results.slice(0, 10));
        } else {
            moviesContainer.innerHTML = 'Film bulunamadı.';
        }
    } catch (error) {
        console.error('Film verileri alınırken hata oluştu:', error);
        moviesContainer.innerHTML = 'Bir hata oluştu: ' + error.message;
    } finally {
        loadingElement.classList.add('hidden');
    }
}

async function getMovieTrailer(movieId) {
    try {
        // Önce Türkçe fragman ara
        const trUrl = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}&language=tr-TR`;
        const trResponse = await fetch(trUrl);
        const trData = await trResponse.json();
        
        let trailer = trData.results.find(video => 
            video.type === "Trailer" && video.site === "YouTube"
        );

        // Türkçe fragman bulunamazsa İngilizce fragman ara
        if (!trailer) {
            const enUrl = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`;
            const enResponse = await fetch(enUrl);
            const enData = await enResponse.json();
            trailer = enData.results.find(video => 
                video.type === "Trailer" && video.site === "YouTube"
            );
        }

        return trailer ? trailer.key : null;
    } catch (error) {
        console.error('Fragman bilgisi alınamadı:', error);
        return null;
    }
}

async function getMovieDetails(movieId) {
    try {
        // Film detaylarını al
        const detailUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=tr-TR&append_to_response=credits,similar`;
        const detailResponse = await fetch(detailUrl);
        const movieData = await detailResponse.json();

        // Oyuncu kadrosunu al (ilk 5 oyuncu)
        const cast = movieData.credits.cast.slice(0, 5);

        return {
            ...movieData,
            cast: cast
        };
    } catch (error) {
        console.error('Film detayları alınamadı:', error);
        return null;
    }
}

async function displayMovies(movies) {
    const container = document.getElementById('movies-container');
    container.innerHTML = '';
    
    try {
        // Reklamlı film grid'ini ekle
        const movieGrid = await insertAdsBetweenMovies(movies);
        if (movieGrid instanceof Node) {
            container.appendChild(movieGrid);
        } else {
            console.error('Movie grid is not a valid DOM node:', movieGrid);
            container.innerHTML = '<div class="error">Filmler yüklenirken bir hata oluştu.</div>';
        }
    } catch (error) {
        console.error('Display movies error:', error);
        container.innerHTML = '<div class="error">Filmler yüklenirken bir hata oluştu.</div>';
    }
}

function openTrailerModal(title, trailerKey) {
    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title} - Fragman</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/${trailerKey}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Modal kapatma işlemleri
    const closeModal = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    };

    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function openMovieDetailsModal(movie) {
    const modal = document.createElement('div');
    modal.className = 'movie-details-modal';

    const genres = movie.genres.map(genre => genre.name).join(', ');
    const cast = movie.cast.map(actor => actor.name).join(', ');
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}s ${movie.runtime % 60}dk` : 'Bilinmiyor';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${movie.title}</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="movie-detail-grid">
                    <div class="movie-poster-large">
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" 
                             alt="${movie.title}" 
                             onerror="this.src='https://via.placeholder.com/500x750?text=Poster+Bulunamadı'">
                    </div>
                    <div class="movie-info-detailed">
                        <div class="info-section">
                            <h3>Özet</h3>
                            <p>${movie.overview || 'Özet bulunmuyor.'}</p>
                        </div>
                        <div class="info-section">
                            <h3>Film Bilgileri</h3>
                            <p><strong>Yayın Tarihi:</strong> ${movie.release_date ? new Date(movie.release_date).toLocaleDateString('tr-TR') : 'Bilinmiyor'}</p>
                            <p><strong>Süre:</strong> ${runtime}</p>
                            <p><strong>Türler:</strong> ${genres}</p>
                            <p><strong>Puan:</strong> ⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</p>
                            <p><strong>Başrol Oyuncuları:</strong> ${cast || 'Bilgi bulunmuyor'}</p>
                        </div>
                        ${movie.homepage ? `
                            <div class="info-section">
                                <a href="${movie.homepage}" target="_blank" class="website-button">
                                    Resmi Web Sitesi
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Modal kapatma işlemleri
    const closeModal = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    };

    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// CSS stillerini güncelle
const styles = `
.movie-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    padding: 20px;
}

.movie-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.movie-poster {
    position: relative;
    width: 100%;
    padding-top: 150%; /* 2:3 aspect ratio */
}

.movie-poster img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.movie-info {
    padding: 15px;
}

.movie-info h3 {
    margin: 0 0 10px 0;
    color: white;
    font-size: 1.2em;
}

.movie-overview {
    color: #ddd;
    font-size: 0.9em;
    margin-bottom: 10px;
    line-height: 1.4;
}

.movie-details {
    display: flex;
    justify-content: space-between;
    color: #aaa;
    font-size: 0.9em;
}

.rating {
    color: #ffd700;
}

.trailer-button {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(229, 9, 20, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.3s ease;
    opacity: 0;
}

.movie-poster:hover .trailer-button {
    opacity: 1;
}

.play-icon {
    font-size: 1.2em;
}

.trailer-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    width: 90%;
    max-width: 900px;
    background: #141414;
    border-radius: 8px;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #232323;
}

.modal-header h3 {
    margin: 0;
    color: white;
}

.close-modal {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
}

.modal-body {
    position: relative;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    height: 0;
}

.modal-body iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

@media (max-width: 768px) {
    .trailer-button {
        opacity: 1;
        font-size: 14px;
        padding: 6px 12px;
    }
}
`;

// Yeni CSS stilleri ekle
const additionalStyles = `
.movie-details-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.movie-details-modal .modal-content {
    width: 90%;
    max-width: 1000px;
    max-height: 90vh;
    background: #141414;
    border-radius: 8px;
    overflow-y: auto;
}

.movie-detail-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
    padding: 20px;
}

.movie-poster-large img {
    width: 100%;
    border-radius: 8px;
}

.movie-info-detailed {
    color: white;
}

.info-section {
    margin-bottom: 20px;
}

.info-section h3 {
    color: #e50914;
    margin-bottom: 10px;
}

.website-button {
    display: inline-block;
    background: #e50914;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    text-decoration: none;
    margin-top: 10px;
}

.details-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(229, 9, 20, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.movie-poster:hover .details-button {
    opacity: 1;
}

@media (max-width: 768px) {
    .movie-detail-grid {
        grid-template-columns: 1fr;
    }
    
    .movie-poster-large {
        max-width: 300px;
        margin: 0 auto;
    }
    
    .details-button {
        opacity: 1;
    }
}
`;

// Stilleri sayfaya ekle
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Yeni stilleri ekle
const detailsStyleSheet = document.createElement("style");
detailsStyleSheet.textContent = additionalStyles;
document.head.appendChild(detailsStyleSheet);

// Rastgele film seçme fonksiyonu
async function getRandomMovie() {
    const loadingElement = document.getElementById('loading');
    const moviesContainer = document.getElementById('movies-container');
    
    loadingElement.classList.remove('hidden');
    moviesContainer.innerHTML = '';
    
    try {
        // Popüler filmlerden rastgele sayfa seç
        const randomPage = Math.floor(Math.random() * 20) + 1;
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=tr-TR&sort_by=popularity.desc&page=${randomPage}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Sayfadaki filmlerden rastgele bir film seç
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const randomMovie = data.results[randomIndex];
            
            // Film detaylarını al
            const movieDetails = await getMovieDetails(randomMovie.id);
            displayMovies([movieDetails]); // Tek film göster
            
            // Rastgele seçim animasyonu
            const randomButton = document.getElementById('randomButton');
            if (randomButton) {
                randomButton.classList.add('spinning');
                setTimeout(() => {
                    randomButton.classList.remove('spinning');
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Rastgele film seçilirken hata oluştu:', error);
        moviesContainer.innerHTML = 'Bir hata oluştu: ' + error.message;
    } finally {
        loadingElement.classList.add('hidden');
    }
}

// Rastgele film butonu ekle
const moodButtonsContainer = document.querySelector('.mood-buttons');
const randomButton = document.createElement('button');
randomButton.id = 'randomButton';
randomButton.innerHTML = '🎲 Rastgele Film';
randomButton.className = 'random-button';
randomButton.onclick = getRandomMovie;
moodButtonsContainer.appendChild(randomButton);

// Yeni CSS stilleri ekle
const randomStyles = `
.random-button {
    background: linear-gradient(45deg, #e50914, #b20710);
    border: none;
    border-radius: 25px;
    padding: 12px 24px;
    color: white;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    transition: all 0.3s ease;
    margin: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.random-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2);
    background: linear-gradient(45deg, #f40612, #c90812);
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.spinning {
    position: relative;
}

.spinning::before {
    content: '🎲';
    position: absolute;
    left: 12px;
    animation: spin 1s linear;
}

.random-result {
    text-align: center;
    padding: 20px;
    color: white;
    font-size: 1.2em;
    margin-bottom: 20px;
}

@media (max-width: 768px) {
    .random-button {
        width: 100%;
        justify-content: center;
        margin: 10px 0;
    }
}
`;

// Yeni stilleri ekle
const randomStyleSheet = document.createElement("style");
randomStyleSheet.textContent = randomStyles;
document.head.appendChild(randomStyleSheet);

// Reklam yönetimi için fonksiyonlar
function initAds() {
    try {
        // Sayfadaki tüm reklam alanlarını başlat
        document.querySelectorAll('.adsbygoogle').forEach(() => {
            (adsbygoogle = window.adsbygoogle || []).push({});
        });
    } catch (error) {
        console.error('Reklam yüklenirken hata:', error);
    }
}

// Film kartı oluşturma fonksiyonu
async function createMovieCard(movie) {
    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card';
    
    const posterUrl = movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=Poster+Bulunamadı';

    // Fragman bilgisini al
    const trailerKey = await getMovieTrailer(movie.id);

    movieCard.innerHTML = `
        <div class="movie-poster">
            <img src="${posterUrl}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/500x750?text=Poster+Bulunamadı'">
            ${trailerKey ? `
                <div class="trailer-button" data-trailer="${trailerKey}">
                    <span class="play-icon">▶️</span>
                    <span>Fragman</span>
                </div>
            ` : ''}
            <div class="details-button">
                <span>Detaylar</span>
            </div>
        </div>
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <p class="movie-overview">${movie.overview || 'Açıklama bulunmuyor.'}</p>
            <div class="movie-details">
                <span class="release-date">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'Bilinmiyor'}</span>
                <span class="rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</span>
            </div>
        </div>
    `;

    // Fragman butonu tıklama olayı
    if (trailerKey) {
        const trailerButton = movieCard.querySelector('.trailer-button');
        trailerButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Film detayları modalının açılmasını engelle
            openTrailerModal(movie.title, trailerKey);
        });
    }

    // Film detayları için tıklama olayı
    movieCard.addEventListener('click', async () => {
        const details = await getMovieDetails(movie.id);
        if (details) {
            openMovieDetailsModal(details);
        }
    });

    return movieCard;
}

// Film kartları arasına reklam ekle fonksiyonunu async yap
async function insertAdsBetweenMovies(movies) {
    const movieGrid = document.createElement('div');
    movieGrid.className = 'movie-grid';
    
    for (let i = 0; i < movies.length; i++) {
        // Normal film kartını ekle
        const movieCard = await createMovieCard(movies[i]);
        movieGrid.appendChild(movieCard);
        
        // Her 4 filmden sonra reklam ekle
        if ((i + 1) % 4 === 0 && i < movies.length - 1) {
            const adContainer = document.createElement('div');
            adContainer.className = 'ad-container between-movies-ad';
            adContainer.innerHTML = `
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="ca-pub-2713493133790758"
                     data-ad-slot="8008672947"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
            `;
            movieGrid.appendChild(adContainer);
            
            // Yeni reklam alanını başlat
            (adsbygoogle = window.adsbygoogle || []).push({});
        }
    }
    
    return movieGrid;
}

// CSS stillerini güncelle
const adStyles = `
.ad-container {
    width: 100%;
    margin: 20px 0;
    min-height: 90px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
}

.top-ad, .bottom-ad {
    max-width: 728px;
    margin: 20px auto;
}

.sidebar-ad {
    position: fixed;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 160px;
    min-height: 600px;
    display: none; /* Mobilde gizle */
}

.between-movies-ad {
    grid-column: 1 / -1;
    height: 90px;
    margin: 20px 0;
}

@media (min-width: 1200px) {
    .sidebar-ad {
        display: block;
    }
    
    .container {
        margin-right: 200px; /* Kenar çubuğu için alan bırak */
    }
}
`;

// Reklam bloklayıcı kontrolü
function checkAdBlocker() {
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    document.body.appendChild(testAd);
    
    window.setTimeout(() => {
        if (testAd.offsetHeight === 0) {
            // Reklam engelleyici tespit edildi
            const message = document.createElement('div');
            message.className = 'ad-blocked-message';
            message.innerHTML = 'Lütfen sitemizi desteklemek için reklam engelleyicinizi kapatın 🙏';
            document.body.insertBefore(message, document.body.firstChild);
        }
        testAd.remove();
    }, 100);
}

// Hata mesajı stili ekle
const errorStyles = `
.error {
    color: white;
    background: rgba(229, 9, 20, 0.1);
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    margin: 20px auto;
    max-width: 600px;
}
`;

// Hata stillerini ekle
const errorStyleSheet = document.createElement("style");
errorStyleSheet.textContent = errorStyles;
document.head.appendChild(errorStyleSheet);

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Reklam stillerini ekle
    const styleSheet = document.createElement('style');
    styleSheet.textContent = adStyles;
    document.head.appendChild(styleSheet);
    
    // Reklamları başlat
    initAds();
    
    // Reklam bloklayıcı kontrolü
    checkAdBlocker();
}); 