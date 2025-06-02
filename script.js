const API_BASE_URL = 'https://express-book-reviews-beta.vercel.app';

// DOM Elements
const sections = {
    'all-books': document.getElementById('all-books'),
    'search-books': document.getElementById('search-books'),
    'reviews-section': document.getElementById('reviews-section'),
    'book-details': document.getElementById('book-details')
};

let currentUser = null;
let currentToken = null;
let selectedBook = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadAllBooks();
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            showSection(sectionId);
        });
    });

    // Authentication
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Search
    document.getElementById('search-btn').addEventListener('click', performSearch);

    // Reviews
    document.getElementById('submit-review').addEventListener('click', submitReview);
    document.getElementById('update-review').addEventListener('click', updateReview);
    document.getElementById('delete-review').addEventListener('click', deleteReview);
    document.getElementById('back-btn').addEventListener('click', () => showSection('all-books'));
}

function showSection(sectionId) {
    // Hide all sections
    Object.values(sections).forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // Show selected section
    const section = sections[sectionId];
    if (section) {
        section.style.display = 'block';
        section.classList.add('active');
    }

    // Load data if needed
    if (sectionId === 'reviews-section' && currentUser) {
        loadUserReviews();
    }
}

// Authentication functions
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/customer/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = username;
            currentToken = data.token;
            
            // Update UI
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('logged-in-user').textContent = `Welcome, ${username}`;
            document.getElementById('reviews-btn').style.display = 'block';
            
            alert('Login successful');
        } else {
            const error = await response.text();
            alert(`Login failed: ${error}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.text();
        alert(data);
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

function logout() {
    currentUser = null;
    currentToken = null;
    
    // Update UI
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('reviews-btn').style.display = 'none';
    
    // Refresh data
    loadAllBooks();
    showSection('all-books');
    alert('Logged out successfully');
}

// Book functions
async function loadAllBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', data); // For debugging
        
        // Extract books from the response
        const books = data.books ? Object.values(data.books) : [];
        displayBooks(books, 'books-container');
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('books-container').innerHTML = 
            `<p>Error loading books: ${error.message}</p>`;
    }
}

async function performSearch() {
    const searchType = document.getElementById('search-type').value;
    const searchTerm = document.getElementById('search-input').value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (!searchTerm) {
        resultsContainer.innerHTML = '<p>Please enter a search term</p>';
        return;
    }

    try {
        let endpoint = '';
        switch(searchType) {
            case 'isbn':
                endpoint = `/isbn/${searchTerm}`;
                break;
            case 'author':
                endpoint = `/author/${encodeURIComponent(searchTerm)}`;
                break;
            case 'title':
                endpoint = `/title/${encodeURIComponent(searchTerm)}`;
                break;
            default:
                resultsContainer.innerHTML = '<p>Invalid search type</p>';
                return;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            resultsContainer.innerHTML = `<p>${errorText || 'Search failed'}</p>`;
            return;
        }

        const contentType = response.headers.get('content-type');
        let result;

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = await response.text();
            try {
                result = JSON.parse(result);
            } catch {
                resultsContainer.innerHTML = `<p>${result}</p>`;
                return;
            }
        }

        if (Array.isArray(result)) {
            displayBooks(result, 'search-results');
        } else if (result && typeof result === 'object') {
            displayBooks([result], 'search-results');
        } else if (typeof result === 'string') {
            resultsContainer.innerHTML = `<p>${result}</p>`;
        } else {
            resultsContainer.innerHTML = '<p>No results found</p>';
        }

    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `
            <p>Error performing search: ${error.message}</p>
            <p>Please try again later.</p>
        `;
    }
}
function displayBooks(books, containerId) {
    const container = document.getElementById(containerId);
    
    if (!books || (Array.isArray(books) && books.length === 0)) {
        container.innerHTML = '<p>No books found.</p>';
        return;
    }

    // Convert to array if it's an object
    if (!Array.isArray(books)) {
        books = Object.values(books);
    }

    container.innerHTML = books.map(book => {
        // Handle different response formats
        const bookData = book.title ? book : (book.book || book[Object.keys(book)[0]]);
        const isbn = book.isbn || Object.keys(book)[0];
        const title = bookData?.title || 'Unknown Title';
        const author = bookData?.author || 'Unknown Author';

        return `
            <div class="book-card" data-isbn="${isbn}">
                <h3>${title}</h3>
                <p>By ${author}</p>
                <button class="view-details-btn">View Details</button>
            </div>
        `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isbn = e.target.closest('.book-card').dataset.isbn;
            showBookDetails(isbn);
        });
    });
}

async function showBookDetails(isbn) {
    try {
        const response = await fetch(`${API_BASE_URL}/isbn/${isbn}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to fetch book details');
        }

        const bookData = await response.json();
        
        // The API returns the book directly when fetching by ISBN
        // No need to handle nested format here
        if (!bookData || !bookData.title) {
            throw new Error("Invalid book data received");
        }

        selectedBook = {
            isbn: isbn,
            title: bookData.title,
            author: bookData.author,
            reviews: bookData.reviews || {}
        };

        // Update UI
        document.getElementById('book-title').textContent = selectedBook.title;
        document.getElementById('book-author').textContent = `By ${selectedBook.author}`;
        
        // Reset review form
        document.getElementById('review-text').value = '';
        document.getElementById('update-review').style.display = 'none';
        document.getElementById('delete-review').style.display = 'none';
        document.getElementById('submit-review').style.display = 'block';
        
        // Load reviews
        await loadBookReviews(isbn);
        
        showSection('book-details');
    } catch (error) {
        console.error('Error showing book details:', error);
        alert(`Error loading book details: ${error.message}`);
    }
}

async function loadBookReviews(isbn) {
    const reviewsList = document.getElementById('reviews-list');
    reviewsList.innerHTML = '<p>Loading reviews...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/review/${isbn}`);
        
        if (!response.ok) {
            reviewsList.innerHTML = '<p>No reviews yet.</p>';
            return;
        }

        const reviews = await response.json();
        reviewsList.innerHTML = '';

        if (reviews && typeof reviews === 'object' && Object.keys(reviews).length > 0) {
            for (const reviewId in reviews) {
                const review = reviews[reviewId];
                const reviewElement = document.createElement('div');
                reviewElement.className = 'review';
                reviewElement.innerHTML = `
                    <p><strong>${review.username}</strong>: ${review.review}</p>
                    ${review.username === currentUser ? `
                        <div class="review-actions">
                            <button class="edit-review" data-review-id="${reviewId}">Edit</button>
                        </div>
                    ` : ''}
                `;
                reviewsList.appendChild(reviewElement);
            }

            // Add edit button listeners
            document.querySelectorAll('.edit-review').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const reviewId = e.target.dataset.reviewId;
                    const reviewText = e.target.closest('.review').querySelector('p').textContent.split(': ')[1];
                    document.getElementById('review-text').value = reviewText;
                    document.getElementById('update-review').style.display = 'block';
                    document.getElementById('delete-review').style.display = 'block';
                    document.getElementById('submit-review').style.display = 'none';
                    document.getElementById('update-review').dataset.reviewId = reviewId;
                });
            });
        } else {
            reviewsList.innerHTML = '<p>No reviews yet.</p>';
        }
    } catch (error) {
        reviewsList.innerHTML = '<p>Error loading reviews.</p>';
    }
}

// Review functions
async function submitReview() {
    if (!currentUser) {
        alert('Please login to submit a review');
        return;
    }

    const reviewText = document.getElementById('review-text').value;
    if (!reviewText) {
        alert('Please enter a review');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/customer/auth/review/${selectedBook.isbn || Object.keys(selectedBook)[0]}?review=${encodeURIComponent(reviewText)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const result = await response.text();
        alert(result);
        
        showBookDetails(selectedBook.isbn || Object.keys(selectedBook)[0]);
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Error submitting review. Please try again.');
    }
}

async function updateReview() {
    const reviewText = document.getElementById('review-text').value;
    if (!reviewText) {
        alert('Please enter a review');
        return;
    }

    const reviewId = document.getElementById('update-review').dataset.reviewId;

    try {
        const response = await fetch(`${API_BASE_URL}/customer/auth/review/${selectedBook.isbn || Object.keys(selectedBook)[0]}?review=${encodeURIComponent(reviewText)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const result = await response.text();
        alert(result);
        
        showBookDetails(selectedBook.isbn || Object.keys(selectedBook)[0]);
    } catch (error) {
        console.error('Error updating review:', error);
        alert('Error updating review. Please try again.');
    }
}

async function deleteReview() {
    if (!confirm('Are you sure you want to delete this review?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/customer/auth/review/${selectedBook.isbn || Object.keys(selectedBook)[0]}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const result = await response.text();
        alert(result);
        
        showBookDetails(selectedBook.isbn || Object.keys(selectedBook)[0]);
    } catch (error) {
        console.error('Error deleting review:', error);
        alert('Error deleting review. Please try again.');
    }
}

async function loadUserReviews() {
    if (!currentUser) return;

    try {
        const booksResponse = await fetch(`${API_BASE_URL}/`);
        const books = await booksResponse.json();

        let userReviews = [];
        
        for (const isbn in books) {
            const reviewResponse = await fetch(`${API_BASE_URL}/review/${isbn}`);
            if (reviewResponse.ok) {
                const reviews = await reviewResponse.json();
                
                if (typeof reviews === 'object' && !Array.isArray(reviews)) {
                    for (const reviewId in reviews) {
                        if (reviews[reviewId].username === currentUser) {
                            userReviews.push({
                                book: books[isbn],
                                review: reviews[reviewId]
                            });
                        }
                    }
                }
            }
        }

        const container = document.getElementById('reviews-container');
        if (userReviews.length === 0) {
            container.innerHTML = '<p>You have not submitted any reviews yet.</p>';
        } else {
            container.innerHTML = userReviews.map(item => `
                <div class="review-item">
                    <h3>${item.book.title || item.book[Object.keys(item.book)[0]].title}</h3>
                    <p>By ${item.book.author || item.book[Object.keys(item.book)[0]].author}</p>
                    <p>${item.review.review}</p>
                    <button class="edit-book-review" data-isbn="${Object.keys(item.book)[0] || item.book.isbn}">Edit Review</button>
                </div>
            `).join('');

            document.querySelectorAll('.edit-book-review').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const isbn = e.target.dataset.isbn;
                    showBookDetails(isbn);
                });
            });
        }
    } catch (error) {
        console.error('Error loading user reviews:', error);
        document.getElementById('reviews-container').innerHTML = '<p>Error loading your reviews. Please try again.</p>';
    }
}
