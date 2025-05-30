const API_BASE_URL = 'https://express-book-reviews-one.vercel.app/'; // Update if your backend is hosted elsewhere

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
    
    alert('Logged out successfully');
}

// Book functions
async function loadAllBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        const books = await response.json();
        displayBooks(books, 'books-container');
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('books-container').innerHTML = '<p>Error loading books. Please try again.</p>';
    }
}

async function performSearch() {
    const searchType = document.getElementById('search-type').value;
    const searchTerm = document.getElementById('search-input').value;

    if (!searchTerm) {
        alert('Please enter a search term');
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
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        
        if (response.ok) {
            const result = await response.json();
            // Handle different response formats
            if (Array.isArray(result)) {
                displayBooks(result, 'search-results');
            } else if (typeof result === 'object') {
                displayBooks([result], 'search-results');
            } else {
                // Handle string responses (from some endpoints)
                document.getElementById('search-results').innerHTML = `<p>${result}</p>`;
            }
        } else {
            const error = await response.text();
            document.getElementById('search-results').innerHTML = `<p>${error}</p>`;
        }
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('search-results').innerHTML = '<p>Error performing search. Please try again.</p>';
    }
}

function displayBooks(books, containerId) {
    const container = document.getElementById(containerId);
    
    if (!books || (Array.isArray(books) && books.length === 0)) {
        container.innerHTML = '<p>No books found.</p>';
        return;
    }

    // Convert single book to array for consistent handling
    if (!Array.isArray(books)) {
        books = [books];
    }

    container.innerHTML = books.map(book => `
        <div class="book-card" data-isbn="${Object.keys(book)[0] || book.isbn}">
            <h3>${book.title || book[Object.keys(book)[0]].title}</h3>
            <p>By ${book.author || book[Object.keys(book)[0]].author}</p>
            <button class="view-details-btn">View Details</button>
        </div>
    `).join('');

    // Add event listeners to the book cards
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if a button was clicked
            if (e.target.tagName === 'BUTTON') return;
            
            const isbn = card.dataset.isbn;
            showBookDetails(isbn);
        });
    });

    // Add event listeners to view details buttons
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
        const book = await response.json();
        
        selectedBook = book;
        
        // Update UI
        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-author').textContent = `By ${book.author}`;
        
        // Load reviews
        const reviewsResponse = await fetch(`${API_BASE_URL}/review/${isbn}`);
        let reviews = await reviewsResponse.json();
        
        // Handle different review formats
        if (typeof reviews === 'string') {
            document.getElementById('reviews-list').innerHTML = `<p>${reviews}</p>`;
        } else {
            document.getElementById('reviews-list').innerHTML = Object.values(reviews).map(review => `
                <div class="review-item">
                    <strong>${review.username}</strong>
                    <p>${review.review}</p>
                    ${currentUser === review.username ? 
                        `<button class="edit-review-btn" data-review-id="${Object.keys(reviews).find(key => reviews[key].username === review.username)}">Edit</button>` : ''}
                </div>
            `).join('');
            
            // Add event listeners to edit buttons
            document.querySelectorAll('.edit-review-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const reviewId = e.target.dataset.reviewId;
                    const review = reviews[reviewId];
                    
                    document.getElementById('review-text').value = review.review;
                    document.getElementById('submit-review').style.display = 'none';
                    document.getElementById('update-review').style.display = 'inline-block';
                    document.getElementById('delete-review').style.display = 'inline-block';
                    
                    // Store the review ID for update/delete
                    document.getElementById('update-review').dataset.reviewId = reviewId;
                    document.getElementById('delete-review').dataset.reviewId = reviewId;
                });
            });
        }
        
        // Reset review form
        document.getElementById('review-text').value = '';
        document.getElementById('submit-review').style.display = 'inline-block';
        document.getElementById('update-review').style.display = 'none';
        document.getElementById('delete-review').style.display = 'none';
        
        showSection('book-details');
    } catch (error) {
        console.error('Error loading book details:', error);
        alert('Error loading book details. Please try again.');
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
        
        // Refresh the book details
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
        
        // Refresh the book details
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
        
        // Refresh the book details
        showBookDetails(selectedBook.isbn || Object.keys(selectedBook)[0]);
    } catch (error) {
        console.error('Error deleting review:', error);
        alert('Error deleting review. Please try again.');
    }
}

async function loadUserReviews() {
    if (!currentUser) return;

    try {
        // Get all books first
        const booksResponse = await fetch(`${API_BASE_URL}/`);
        const books = await booksResponse.json();

        // Check each book for reviews by the current user
        let userReviews = [];
        
        for (const isbn in books) {
            const reviewResponse = await fetch(`${API_BASE_URL}/review/${isbn}`);
            const reviews = await reviewResponse.json();
            
            if (typeof reviews !== 'string') { // Skip if no reviews
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

        // Display user reviews
        const container = document.getElementById('reviews-container');
        if (userReviews.length === 0) {
            container.innerHTML = '<p>You have not submitted any reviews yet.</p>';
        } else {
            container.innerHTML = userReviews.map(item => `
                <div class="review-item">
                    <h3>${item.book.title}</h3>
                    <p>By ${item.book.author}</p>
                    <p>${item.review.review}</p>
                    <button class="edit-book-review" data-isbn="${isbn}">Edit Review</button>
                </div>
            `).join('');

            // Add event listeners to edit buttons
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