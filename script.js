// API Configuration
const API_BASE = 'https://express-book-reviews-one.vercel.app/'; // Replace with your actual URL
let authToken = null;

// DOM Elements
const booksContainer = document.getElementById('books-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loginBtn = document.getElementById('login-btn');
const userGreeting = document.getElementById('user-greeting');
const modal = document.getElementById('modal');
const loginModal = document.getElementById('login-modal');
const closeBtns = document.querySelectorAll('.close-btn');
const modalTitle = document.getElementById('modal-title');
const reviewsContainer = document.getElementById('reviews-container');
const reviewForm = document.getElementById('review-form');
const loginForm = document.getElementById('login-form');

// Current state
let currentBookId = null;

// Event Listeners
searchBtn.addEventListener('click', searchBooks);
loginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
closeBtns.forEach(btn => btn.addEventListener('click', closeModals));
reviewForm.addEventListener('submit', submitReview);
loginForm.addEventListener('submit', handleLogin);

// Initialize
fetchBooks();

// API Functions
async function fetchBooks() {
    try {
        const response = await fetch(`${API_BASE}/`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error fetching books:', error);
        alert('Failed to load books');
    }
}

async function searchBooks() {
    const query = searchInput.value.trim();
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error searching books:', error);
        alert('Search failed');
    }
}

async function getBookDetails(bookId) {
    try {
        const response = await fetch(`${API_BASE}/book/${bookId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching book details:', error);
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
            body: JSON.stringify({ review: reviewText })
        });
        
        if (response.ok) {
            const book = await getBookDetails(currentBookId);
            displayReviews(book.reviews);
            reviewForm.reset();
        } else {
            alert('Failed to submit review');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Review submission failed');
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
            updateAuthUI(username);
            loginModal.classList.add('hidden');
            loginForm.reset();
        } else {
            alert('Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert('Login failed');
    }
}

// UI Functions
function displayBooks(books) {
    booksContainer.innerHTML = '';
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <h3>${book.title}</h3>
            <p>by ${book.author}</p>
            <p>${book.reviews?.length || 0} reviews</p>
        `;
        bookCard.addEventListener('click', () => openBookModal(book.id));
        booksContainer.appendChild(bookCard);
    });
}

async function openBookModal(bookId) {
    currentBookId = bookId;
    const book = await getBookDetails(bookId);
    if (!book) {
        alert('Failed to load book details');
        return;
    }
    
    modalTitle.textContent = `${book.title} by ${book.author}`;
    reviewsContainer.innerHTML = '';
    
    if (book.reviews && book.reviews.length > 0) {
        displayReviews(book.reviews);
    } else {
        reviewsContainer.innerHTML = '<p>No reviews yet.</p>';
    }
    
    reviewForm.classList.toggle('hidden', !authToken);
    modal.classList.remove('hidden');
}

function displayReviews(reviews) {
    reviewsContainer.innerHTML = '';
    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review';
        reviewElement.innerHTML = `
            <p><strong>${review.username || 'Anonymous'}</strong></p>
            <p>${review.text}</p>
            <small>${new Date(review.date).toLocaleDateString()}</small>
        `;
        reviewsContainer.appendChild(reviewElement);
    });
}

function updateAuthUI(username) {
    loginBtn.classList.add('hidden');
    userGreeting.classList.remove('hidden');
    userGreeting.textContent = `Welcome, ${username}`;
}

function closeModals() {
    modal.classList.add('hidden');
    loginModal.classList.add('hidden');
}