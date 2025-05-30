// API Configuration
const API_BASE = 'https://express-book-reviews-one.vercel.app/'; // Replace with your actual URL
let authToken = null;
let currentUser = null;

// DOM Elements
const booksContainer = document.getElementById('books-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userGreeting = document.getElementById('user-greeting');
const modal = document.getElementById('modal');
const loginModal = document.getElementById('login-modal');
const closeBtns = document.querySelectorAll('.close-btn');
const modalTitle = document.getElementById('modal-title');
const bookDetails = document.getElementById('book-details');
const reviewsContainer = document.getElementById('reviews-container');
const reviewForm = document.getElementById('review-form');
const loginForm = document.getElementById('login-form');

// Current state
let currentBookId = null;
let allBooks = {};

// Event Listeners
searchBtn.addEventListener('click', searchBooks);
loginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
logoutBtn.addEventListener('click', handleLogout);
closeBtns.forEach(btn => btn.addEventListener('click', closeModals));
reviewForm.addEventListener('submit', submitReview);
loginForm.addEventListener('submit', handleLogin);

// Initialize
fetchBooks();

// API Functions
async function fetchBooks() {
    try {
        const response = await fetch(`${API_BASE}/`);
        allBooks = await response.json();
        displayBooks(allBooks);
    } catch (error) {
        console.error('Error fetching books:', error);
        showError('Failed to load books');
    }
}

function searchBooks() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        displayBooks(allBooks);
        return;
    }

    const filteredBooks = Object.entries(allBooks).reduce((acc, [id, book]) => {
        if (book.title.toLowerCase().includes(query) || 
            book.author.toLowerCase().includes(query)) {
            acc[id] = book;
        }
        return acc;
    }, {});

    displayBooks(filteredBooks);
}

async function getBookDetails(bookId) {
    try {
        const response = await fetch(`${API_BASE}/book/${bookId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching book details:', error);
        showError('Failed to load book details');
        return null;
    }
}

async function submitReview(e) {
    e.preventDefault();
    if (!authToken) return;
    
    const reviewText = document.getElementById('review-text').value;
    try {
        const response = await fetch(`${API_BASE}/customer/review/${currentBookId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                text: reviewText,
                rating: document.getElementById('review-rating').value 
            })
        });
        
        if (response.ok) {
            const book = await getBookDetails(currentBookId);
            displayBookModal(book);
            reviewForm.reset();
        } else {
            showError('Failed to submit review');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showError('Review submission failed');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/customer/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            currentUser = username;
            updateAuthUI();
            loginModal.classList.add('hidden');
            loginForm.reset();
        } else {
            showError('Invalid username or password');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        showError('Login failed');
    }
}

async function handleLogout() {
    authToken = null;
    currentUser = null;
    updateAuthUI();
    if (!modal.classList.contains('hidden')) {
        const book = await getBookDetails(currentBookId);
        displayBookModal(book);
    }
}

// UI Functions
function displayBooks(books) {
    booksContainer.innerHTML = '';
    
    Object.entries(books).forEach(([id, book]) => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <h3>${book.title}</h3>
            <p class="author">by ${book.author}</p>
            <div class="review-count">
                ${Object.keys(book.reviews).length} review(s)
            </div>
        `;
        bookCard.addEventListener('click', () => openBookModal(id));
        booksContainer.appendChild(bookCard);
    });
}

async function openBookModal(bookId) {
    currentBookId = bookId;
    const book = await getBookDetails(bookId);
    if (!book) return;
    
    displayBookModal(book);
    modal.classList.remove('hidden');
}

function displayBookModal(book) {
    modalTitle.textContent = book.title;
    
    bookDetails.innerHTML = `
        <p class="author">by ${book.author}</p>
        ${book.description ? `<p class="description">${book.description}</p>` : ''}
    `;
    
    reviewsContainer.innerHTML = '';
    
    if (book.reviews && Object.keys(book.reviews).length > 0) {
        displayReviews(book.reviews);
    } else {
        reviewsContainer.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
    }
    
    reviewForm.classList.toggle('hidden', !authToken);
}

function displayReviews(reviews) {
    reviewsContainer.innerHTML = '';
    
    Object.entries(reviews).forEach(([id, review]) => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review';
        reviewElement.innerHTML = `
            <div class="review-header">
                <strong>${review.username || 'Anonymous'}</strong>
                ${review.rating ? `<span class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>` : ''}
            </div>
            <p class="review-text">${review.text}</p>
            <small class="review-date">${new Date(review.date).toLocaleDateString()}</small>
        `;
        reviewsContainer.appendChild(reviewElement);
    });
}

function updateAuthUI() {
    if (authToken) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        userGreeting.classList.remove('hidden');
        userGreeting.textContent = `Welcome, ${currentUser}`;
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        userGreeting.classList.add('hidden');
    }
}

function closeModals() {
    modal.classList.add('hidden');
    loginModal.classList.add('hidden');
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
}