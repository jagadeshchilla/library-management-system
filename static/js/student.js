// Student Dashboard JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Initialize tabs
  utils.initTabs();

  // Check authentication
  const auth = utils.checkAuth();
  if (!auth || auth.role !== "student") {
    window.location.href = "/login";
    return;
  }

  // Load student name
  loadStudentInfo();

  // Load dashboard data
  loadDashboardData();

  // Load search functionality
  document
    .getElementById("searchBookBtn")
    .addEventListener("click", function () {
      const query = document.getElementById("bookSearchInput").value;
      searchBooks(query);
    });

  // Enter key in search input
  document
    .getElementById("bookSearchInput")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        const query = this.value;
        searchBooks(query);
      }
    });

  // Load borrowed books when tab is clicked
  document
    .querySelector('a[href="#borrowed"]')
    .addEventListener("click", function () {
      loadBorrowedBooks();
    });

  // Load recommendations when tab is clicked
  document
    .querySelector('a[href="#recommendations"]')
    .addEventListener("click", function () {
      loadRecommendations();
    });

  // Book details modal events
  document.addEventListener("click", function (e) {
    // View book details
    if (
      e.target.classList.contains("view-details") ||
      e.target.closest(".view-details")
    ) {
      const button = e.target.classList.contains("view-details")
        ? e.target
        : e.target.closest(".view-details");
      const isbn = button.getAttribute("data-isbn");
      viewBookDetails(isbn);
    }

    // Borrow book from card
    if (
      e.target.classList.contains("borrow-book") ||
      e.target.closest(".borrow-book")
    ) {
      const button = e.target.classList.contains("borrow-book")
        ? e.target
        : e.target.closest(".borrow-book");
      const isbn = button.getAttribute("data-isbn");
      borrowBook(isbn);
    }
  });

  // Borrow book from modal
  document
    .getElementById("borrowBookBtn")
    .addEventListener("click", function () {
      const isbn = this.getAttribute("data-isbn");
      borrowBook(isbn);
    });
});

// Load student information
async function loadStudentInfo() {
  try {
    const response = await utils.fetchWithAuth("/api/student/profile");
    const data = await response.json();

    // Update all instances of student name
    const studentNameElements = document.querySelectorAll("#studentName");
    studentNameElements.forEach((element) => {
      element.textContent = data.name || "Student";
    });

    // Update other profile information if elements exist
    const emailElement = document.getElementById("studentEmail");
    const idElement = document.getElementById("studentId");
    const joinDateElement = document.getElementById("joinDate");

    if (emailElement) emailElement.textContent = data.email || "";
    if (idElement) idElement.textContent = data.user_id || "";
    if (joinDateElement && data.created_at) {
      joinDateElement.textContent = utils.formatDate(data.created_at);
    }
  } catch (error) {
    console.error("Error loading student info:", error);
    // Update name elements to show "Student" in case of error
    const studentNameElements = document.querySelectorAll("#studentName");
    studentNameElements.forEach((element) => {
      element.textContent = "Student";
    });
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    // Fetch dashboard statistics
    const statsResponse = await utils.fetchWithAuth(
      "/api/student/dashboard-stats"
    );
    const stats = await statsResponse.json();

    // Update dashboard cards
    document.getElementById("currentlyBorrowed").textContent =
      stats.currently_borrowed;
    document.getElementById("totalBorrowed").textContent = stats.total_borrowed;
    document.getElementById("overdueBooks").textContent = stats.overdue_books;

    // Load borrowed books
    loadBorrowedBooks();

    // Load in the new order: recently added, popular, recommendations
    // 1. Load recently added books
    loadRecentlyAddedBooks();

    // 2. Load popular books
    loadPopularBooks();

    // 3. Load recommendations
    loadRecommendations();
  } catch (error) {
    utils.handleApiError(error);
  }
}

// Set up auto-refresh for dashboard data
setInterval(loadDashboardData, 60000); // Refresh every minute

// Load recently added books
async function loadRecentlyAddedBooks() {
  try {
    const response = await utils.fetchWithAuth("/api/books/recent");
    const data = await response.json();

    const recentlyAddedContainer =
      document.getElementById("recentlyAddedBooks");
    recentlyAddedContainer.className = "books-slider-container";
    recentlyAddedContainer.style.display = "flex";
    recentlyAddedContainer.style.overflowX = "hidden";
    recentlyAddedContainer.style.scrollBehavior = "smooth";
    recentlyAddedContainer.style.gap = "1rem";
    recentlyAddedContainer.style.padding = "1rem 0";

    const containerWrapper = document.createElement("div");
    containerWrapper.className = "position-relative";
    recentlyAddedContainer.parentElement.appendChild(containerWrapper);
    containerWrapper.appendChild(recentlyAddedContainer);

    const prevButton = document.createElement("button");
    prevButton.className = "btn btn-light slider-nav prev-btn";
    prevButton.innerHTML = "&lt;";
    prevButton.onclick = (event) => slideBooks("prev");

    const nextButton = document.createElement("button");
    nextButton.className = "btn btn-light slider-nav next-btn";
    nextButton.innerHTML = "&gt;";
    nextButton.onclick = (event) => slideBooks("next");

    containerWrapper.appendChild(prevButton);
    containerWrapper.appendChild(nextButton);

    if (data.books.length === 0) {
      recentlyAddedContainer.innerHTML =
        '<div class="col-12 text-center">No recently added books</div>';
      return;
    }

    // Clear existing content
    recentlyAddedContainer.innerHTML = "";

    // Get current date for comparison to identify new books
    const currentDate = new Date();
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    data.books.forEach((book) => {
      // Add NEW badge to all books in the recently added section
      book.isNew = true;

      const bookCard = createBookCardWithBadge(book);
      const viewDetailsBtn = bookCard.querySelector(".view-details");
      const borrowBtn = bookCard.querySelector(".borrow-book");

      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener("click", () => {
          viewBookDetails(book.isbn);
          loadSimilarBooks(book.isbn);
        });
      }
      if (borrowBtn) {
        borrowBtn.addEventListener("click", () => borrowBook(book.isbn));
      }

      recentlyAddedContainer.appendChild(bookCard);
    });
  } catch (error) {
    utils.handleApiError(error);
  }
}

// Helper function to create book card with NEW badge
function createBookCardWithBadge(book) {
  const card = document.createElement("div");
  card.className = "book-card";
  card.style.minWidth = "250px"; // Standardized card width
  card.style.maxWidth = "250px";
  card.style.margin = "0 5px"; // Reduced margin from 10px to 5px

  const imageUrl =
    book.image_url_m ||
    book.image_url_s ||
    book.image_url_l ||
    "static/images/default-book.jpg";

  card.innerHTML = `
    <div class="card h-100 position-relative">
      ${
        book.isNew
          ? '<span class="badge bg-success position-absolute" style="top: 10px; left: 10px; z-index: 1;">NEW</span>'
          : ""
      }
      <div class="card-img-container" style="height: 300px; overflow: hidden; background: #f8f9fa; display: flex; align-items: center; justify-content: center; padding: 8px;">
        <img src="${imageUrl}" 
             class="card-img-top" 
             alt="${book.title}" 
             style="max-height: 100%; width: auto; max-width: 100%; object-fit: contain; transition: transform 0.3s ease;"
             onerror="this.src='static/images/default-book.jpg'">
      </div>
      <div class="card-body d-flex flex-column" style="height: 150px; padding: 12px;">
        <h6 class="card-title text-truncate mb-1" style="font-size: 1rem;">${
          book.title
        }</h6>
        <p class="card-text small mb-2" style="color: #666;">By ${
          book.author
        }</p>
        <div class="mt-auto pt-2 d-flex justify-content-between gap-1">
          <button class="btn btn-sm btn-outline-primary flex-grow-1 view-details" data-isbn="${
            book.isbn
          }">
            Details
          </button>
          <button class="btn btn-sm btn-success flex-grow-1 borrow-book" data-isbn="${
            book.isbn
          }">
            Borrow
          </button>
        </div>
      </div>
    </div>
  `;

  return card;
}

// Load similar books based on ISBN
async function loadSimilarBooks(isbn) {
  try {
    const response = await utils.fetchWithAuth(`/api/books/${isbn}/similar`);
    const data = await response.json();

    const similarBooksContainer = document.getElementById(
      "similarBooksContainer"
    );
    similarBooksContainer.innerHTML = "";

    if (data.books.length === 0) {
      similarBooksContainer.innerHTML =
        '<div class="col-12 text-center">No similar books found</div>';
      return;
    }

    data.books.forEach((book) => {
      const col = document.createElement("div");
      col.className = "col-md-4 mb-3";

      const imageUrl =
        book.image_url_s || "https://via.placeholder.com/100x150?text=No+Image";

      col.innerHTML = `
        <div class="card h-100">
          <img src="${imageUrl}" class="card-img-top" alt="${book.title}" style="height: 150px; object-fit: cover;">
        <div class="card-body">
            <h6 class="card-title">${book.title}</h6>
            <p class="card-text small">By ${book.author}</p>
            <button class="btn btn-sm btn-outline-primary view-details" data-isbn="${book.isbn}">
              View Details
            </button>
            <button class="btn btn-sm btn-success borrow-book" data-isbn="${book.isbn}">
              Borrow
            </button>
          </div>
        </div>
      `;

      // Add event listeners for both buttons
      const viewDetailsBtn = col.querySelector(".view-details");
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener("click", () =>
          viewBookDetails(book.isbn)
        );
      }

      const borrowBtn = col.querySelector(".borrow-book");
      if (borrowBtn) {
        borrowBtn.addEventListener("click", () => borrowBook(book.isbn));
      }

      similarBooksContainer.appendChild(col);
    });
  } catch (error) {
    utils.handleApiError(error);
  }
}

// Slider navigation function
function slideBooks(direction) {
  const button = event.currentTarget;
  const sliderContainer = button
    .closest(".position-relative")
    .querySelector(".books-slider-container");
  const cardWidth = 300; // Width of one book card including margin
  const visibleWidth = sliderContainer.clientWidth;
  const scrollAmount = Math.floor(visibleWidth / cardWidth) * cardWidth;

  if (direction === "next") {
    sliderContainer.scrollBy({ left: scrollAmount, behavior: "smooth" });
  } else {
    sliderContainer.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  }

  // Update button visibility
  setTimeout(() => {
    const prevBtn = button
      .closest(".position-relative")
      .querySelector(".prev-btn");
    const nextBtn = button
      .closest(".position-relative")
      .querySelector(".next-btn");

    prevBtn.style.display = sliderContainer.scrollLeft <= 0 ? "none" : "flex";
    nextBtn.style.display =
      sliderContainer.scrollLeft + sliderContainer.clientWidth >=
      sliderContainer.scrollWidth
        ? "none"
        : "flex";
  }, 100);
}

// Load popular books
async function loadPopularBooks() {
  try {
    const response = await fetch("/api/books/popular");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Popular books data:", data);

    const popularBooksContainer = document.getElementById("popularBooks");
    popularBooksContainer.innerHTML = "";

    // Check if books array exists and has items
    if (!data.books || !Array.isArray(data.books) || data.books.length === 0) {
      popularBooksContainer.innerHTML =
        '<div class="col-12 text-center">No popular books available</div>';
      return;
    }

    // Add each book to the container
    data.books.forEach((book) => {
      const col = document.createElement("div");
      col.className = "col-md-3";
      col.style.minWidth = "200px"; // Reduced from 300px
      col.style.maxWidth = "200px"; // Added max-width
      col.style.padding = "5px"; // Reduced padding

      const card = document.createElement("div");
      card.className = "book-card card h-100";

      const imgSrc = getValidImageUrl(book);

      card.innerHTML = `
        <div class="card-img-wrapper" style="height: 180px; overflow: hidden; background: #f8f9fa;">
          <img src="${imgSrc}" 
               class="card-img-top" 
               alt="${book.title || "Book Title"}"
               style="height: 100%; width: 100%; object-fit: contain; padding: 5px;"
               onerror="this.onerror=null; this.src='/static/images/default-book.jpg';">
        </div>
        <div class="card-body p-2"> <!-- Reduced padding -->
          <h6 class="card-title text-truncate mb-1" style="font-size: 0.9rem;">${
            book.title || "Unknown Title"
          }</h6>
          <p class="card-text small mb-1" style="font-size: 0.8rem;">By ${
            book.author || "Unknown Author"
          }</p>
          <p class="card-text">
            <small class="text-muted" style="font-size: 0.75rem;">
              Rating: ${(book.rating || 0).toFixed(1)}/10 (${book.votes || 0})
            </small>
          </p>
        </div>
        <div class="card-footer p-2 bg-transparent"> <!-- Reduced padding -->
          <div class="d-flex gap-1 justify-content-between">
            <button class="btn btn-sm btn-outline-primary flex-grow-1 py-1" style="font-size: 0.8rem;" data-isbn="${
              book.isbn
            }">
              Details
            </button>
            <button class="btn btn-sm btn-success flex-grow-1 py-1" style="font-size: 0.8rem;" data-isbn="${
              book.isbn
            }">
              Borrow
            </button>
          </div>
        </div>
      `;

      // Add event listeners to buttons
      const viewDetailsBtn = card.querySelector(".btn-outline-primary");
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener("click", () =>
          viewBookDetails(book.isbn)
        );
      }

      const borrowBtn = card.querySelector(".btn-success");
      if (borrowBtn) {
        borrowBtn.addEventListener("click", () => borrowBook(book.isbn));
      }

      col.appendChild(card);
      popularBooksContainer.appendChild(col);
    });
  } catch (error) {
    console.error("Error loading popular books:", error);
    document.getElementById("popularBooks").innerHTML =
      '<div class="col-12 text-center text-danger">Error loading popular books: ' +
      error.message +
      "</div>";
  }
}

// Helper function to get valid image URL
function getValidImageUrl(book) {
  if (book.image_url_m && book.image_url_m !== "None") return book.image_url_m;
  if (book.image_url_l && book.image_url_l !== "None") return book.image_url_l;
  if (book.image_url_s && book.image_url_s !== "None") return book.image_url_s;
  if (book.image_url && book.image_url !== "None") return book.image_url;
  return "/static/images/default-book.jpg";
}

// Search books
async function searchBooks(query, page = 1) {
  if (!query) {
    utils.showNotification("Please enter a search term", "warning");
    return;
  }

  try {
    const response = await utils.fetchWithAuth(
      `/api/books/search?query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await response.json();

    const searchResultsContainer = document.getElementById("searchResults");
    searchResultsContainer.innerHTML = "";

    if (data.books.length === 0) {
      searchResultsContainer.innerHTML =
        '<div class="col-12 text-center">No books found matching your search</div>';
      return;
    }

    // Create book cards for search results
    data.books.forEach((book) => {
      const col = document.createElement("div");
      col.className = "col-md-3 mb-4";

      const card = document.createElement("div");
      card.className = "book-card card h-100";

      const imgSrc = getValidImageUrl(book);

      card.innerHTML = `
        <div class="card-img-wrapper" style="height: 200px; overflow: hidden;">
          <img src="${imgSrc}" 
               class="card-img-top" 
               alt="${book.title}"
               style="height: 100%; width: 100%; object-fit: contain;"
               onerror="this.onerror=null; this.src='/static/images/default-book.jpg';">
        </div>
        <div class="card-body">
          <h5 class="card-title text-truncate">${
            book.title || "Unknown Title"
          }</h5>
          <p class="card-text">Author: ${book.author || "Unknown Author"}</p>
          <p class="card-text">
            <small class="text-muted">
              Publisher: ${book.publisher || "Unknown Publisher"}<br>
              Year: ${book.year || "Unknown"}
            </small>
          </p>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm view-details" data-isbn="${
            book.isbn
          }">View Details</button>
          <button class="btn btn-success btn-sm borrow-book" data-isbn="${
            book.isbn
          }">Borrow</button>
        </div>
      `;

      // Add event listeners to buttons
      const viewDetailsBtn = card.querySelector(".view-details");
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener("click", () =>
          viewBookDetails(book.isbn)
        );
      }

      const borrowBtn = card.querySelector(".borrow-book");
      if (borrowBtn) {
        borrowBtn.addEventListener("click", () => borrowBook(book.isbn));
      }

      col.appendChild(card);
      searchResultsContainer.appendChild(col);
    });

    // Create pagination
    const paginationContainer = document.getElementById("searchPagination");
    paginationContainer.innerHTML = "";

    if (data.totalPages > 1) {
      const pagination = utils.createPagination(
        data.currentPage,
        data.totalPages,
        (newPage) => {
          searchBooks(query, newPage);
        }
      );
      paginationContainer.appendChild(pagination);
    }
  } catch (error) {
    utils.handleApiError(error);
  }
}

// Load borrowed books
async function loadBorrowedBooks() {
  try {
    const response = await utils.fetchWithAuth("/api/student/borrowed-books");
    const data = await response.json();

    // Current borrowed books
    const borrowedBooksTableBody = document.getElementById(
      "borrowedBooksTableBody"
    );
    borrowedBooksTableBody.innerHTML = "";

    if (data.current_borrowed.length === 0) {
      borrowedBooksTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">No books currently borrowed</td></tr>';
    } else {
      data.current_borrowed.forEach((book) => {
        const isOverdue = utils.isOverdue(book.due_date);
        const status = isOverdue ? "Overdue" : "Borrowed";
        const statusClass = isOverdue ? "danger" : "warning";

        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${book.book_title}</td>
                    <td>${book.book_author}</td>
                    <td>${utils.formatDate(book.borrow_date)}</td>
                    <td>${utils.formatDate(book.due_date)}</td>
                    <td><span class="badge bg-${statusClass}">${status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-success return-book" data-id="${
                          book.borrow_id
                        }">
                            Return Book
                        </button>
                    </td>
                `;
        borrowedBooksTableBody.appendChild(row);
      });

      // Add event listeners to return buttons
      document.querySelectorAll(".return-book").forEach((button) => {
        button.addEventListener("click", function () {
          const id = this.getAttribute("data-id");
          returnBook(id);
        });
      });
    }

    // Borrowing history
    const borrowHistoryTableBody = document.getElementById(
      "borrowHistoryTableBody"
    );
    borrowHistoryTableBody.innerHTML = "";

    if (data.history.length === 0) {
      borrowHistoryTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center">No borrowing history</td></tr>';
    } else {
      data.history.forEach((book) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${book.book_title}</td>
                    <td>${book.book_author}</td>
                    <td>${utils.formatDate(book.borrow_date)}</td>
                    <td>${utils.formatDate(book.return_date)}</td>
                    <td>$${book.fine.toFixed(2)}</td>
                `;
        borrowHistoryTableBody.appendChild(row);
      });
    }
  } catch (error) {
    utils.handleApiError(error);
  }
}

// Load recommendations
async function loadRecommendations() {
  try {
    const personalizedContainer = document.getElementById(
      "personalizedRecommendations"
    );

    if (!personalizedContainer) {
      console.error("Recommendations container not found");
      return;
    }

    // Get borrowed books history
    const borrowedResponse = await utils.fetchWithAuth(
      "/api/student/borrowed-books"
    );
    const borrowedData = await borrowedResponse.json();

    // Extract authors and genres from borrowed books
    const authors = new Set();
    const genres = new Set();

    // Combine current and historical borrowed books
    const allBorrowedBooks = [
      ...(borrowedData.current_borrowed || []),
      ...(borrowedData.history || []),
    ];

    allBorrowedBooks.forEach((book) => {
      if (book.book_author) authors.add(book.book_author);
      if (book.genre) genres.add(book.genre);
    });

    if (allBorrowedBooks.length === 0) {
      personalizedContainer.innerHTML = `
        <div class="alert alert-info">
          No personalized recommendations available yet. Borrow books to get recommendations!
        </div>`;
    } else {
      // Create recommendations based on borrowed books
      const recommendationsPromises = [];

      // Get recommendations by authors
      authors.forEach((author) => {
        recommendationsPromises.push(
          utils.fetchWithAuth(
            `/api/books/search?query=${encodeURIComponent(
              author
            )}&type=author&limit=3`
          )
        );
      });

      const recommendationsResults = await Promise.all(recommendationsPromises);
      const recommendedBooks = new Set();

      for (const response of recommendationsResults) {
        const data = await response.json();
        data.books.forEach((book) => {
          // Avoid recommending already borrowed books
          const isAlreadyBorrowed = allBorrowedBooks.some(
            (borrowed) => borrowed.ISBN === book.isbn
          );
          if (!isAlreadyBorrowed) {
            recommendedBooks.add(JSON.stringify(book));
          }
        });
      }

      // Convert recommended books Set to Array and create cards
      const recommendedBooksArray = Array.from(recommendedBooks).map((book) =>
        JSON.parse(book)
      );

      if (recommendedBooksArray.length === 0) {
        personalizedContainer.innerHTML = `
          <div class="alert alert-info">
            No new recommendations available. Try borrowing different books!
          </div>`;
      } else {
        personalizedContainer.innerHTML = `
          <div class="row">
            ${recommendedBooksArray
              .map((book) => createBookCardHTML(book))
              .join("")}
          </div>`;

        // Add event listeners to the new buttons
        personalizedContainer
          .querySelectorAll(".view-details")
          .forEach((button) => {
            button.addEventListener("click", () =>
              viewBookDetails(button.getAttribute("data-isbn"))
            );
          });
        personalizedContainer
          .querySelectorAll(".borrow-book")
          .forEach((button) => {
            button.addEventListener("click", () =>
              borrowBook(button.getAttribute("data-isbn"))
            );
          });
      }
    }
  } catch (error) {
    console.error("Error loading recommendations:", error);
    const personalizedContainer = document.getElementById(
      "personalizedRecommendations"
    );

    if (personalizedContainer) {
      personalizedContainer.innerHTML = `
        <div class="alert alert-danger">
          Error loading recommendations: ${error.message}
        </div>`;
    }
  }
}

// Helper function to create book card HTML
function createBookCardHTML(book) {
  const imgSrc = getValidImageUrl(book);
  return `
    <div class="col-md-3 mb-4">
      <div class="book-card card h-100">
        <div class="card-img-wrapper" style="position: relative; padding-top: 150%; overflow: hidden; background: #f8f9fa;">
          <img src="${imgSrc}" 
               class="card-img-top" 
               alt="${book.title || "Book Cover"}"
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; padding: 10px; transition: transform 0.3s ease;"
               onerror="this.onerror=null; this.src='/static/images/default-book.jpg';">
        </div>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title text-truncate mb-2">${
            book.title || "Unknown Title"
          }</h5>
          <p class="card-text flex-grow-1">Author: ${
            book.author || "Unknown Author"
          }</p>
          ${
            book.rating
              ? `
            <p class="card-text">
              <small class="text-muted">
                Rating: ${(book.rating || 0).toFixed(1)}/5 (${
                  book.votes || 0
                } votes)
              </small>
            </p>
            `
              : ""
          }
        </div>
        <div class="card-footer bg-transparent border-top-0 d-flex justify-content-between">
          <button class="btn btn-primary btn-sm flex-grow-1 me-1 view-details" data-isbn="${
            book.isbn
          }">
            View Details
          </button>
          <button class="btn btn-success btn-sm flex-grow-1 ms-1 borrow-book" data-isbn="${
            book.isbn
          }">
            Borrow
          </button>
        </div>
      </div>
    </div>
  `;
}

// View book details
async function viewBookDetails(isbn) {
  try {
    if (!isbn) {
      utils.showNotification("Invalid book ISBN", "danger");
      return;
    }

    const response = await utils.fetchWithAuth(`/api/books/${isbn}`);
    const book = await response.json();

    if (!response.ok) {
      throw new Error(book.error || "Failed to fetch book details");
    }

    // Populate modal with book details
    document.getElementById("bookDetailsTitle").textContent = "Book Details";
    document.getElementById("bookDetailsName").textContent = book.title;
    document.getElementById("bookDetailsAuthor").textContent = book.author;
    document.getElementById("bookDetailsPublisher").textContent =
      book.publisher;
    document.getElementById("bookDetailsYear").textContent = book.year;
    document.getElementById("bookDetailsISBN").textContent = book.isbn;

    // Set image with error handling
    const imageUrl = getValidImageUrl(book);
    const imgElement = document.getElementById("bookDetailsImage");
    imgElement.src = imageUrl;
    imgElement.onerror = function () {
      this.onerror = null;
      this.src = "/static/images/default-book.jpg";
    };

    // Set up borrow button in modal
    const borrowBtn = document.getElementById("borrowBookBtn");
    borrowBtn.setAttribute("data-isbn", book.isbn);

    // Remove any existing event listeners
    borrowBtn.replaceWith(borrowBtn.cloneNode(true));

    // Get the fresh reference to the button
    const newBorrowBtn = document.getElementById("borrowBookBtn");

    if (book.is_borrowed) {
      newBorrowBtn.textContent = "Already Borrowed";
      newBorrowBtn.disabled = true;
      newBorrowBtn.classList.remove("btn-primary");
      newBorrowBtn.classList.add("btn-secondary");
    } else {
      newBorrowBtn.textContent = "Borrow Book";
      newBorrowBtn.disabled = false;
      newBorrowBtn.classList.remove("btn-secondary");
      newBorrowBtn.classList.add("btn-primary");

      // Add click event listener for borrow functionality
      newBorrowBtn.addEventListener("click", async () => {
        await borrowBook(book.isbn);
        // Close the modal after successful borrow
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("bookDetailsModal")
        );
        if (modal) {
          modal.hide();
        }
      });
    }

    // Load similar books
    await loadSimilarBooks(isbn);

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("bookDetailsModal")
    );
    modal.show();
  } catch (error) {
    console.error("Error viewing book details:", error);
    utils.showNotification(
      "Error loading book details: " + error.message,
      "danger"
    );
  }
}

// Borrow book
async function borrowBook(isbn) {
  try {
    if (!isbn) {
      utils.showNotification("Invalid book ISBN", "danger");
      return;
    }

    // Confirm borrowing
    if (!confirm("Are you sure you want to borrow this book?")) {
      return;
    }

    const response = await utils.fetchWithAuth("/api/student/borrow-book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isbn }),
    });

    const data = await response.json();

    if (response.ok) {
      utils.showNotification(
        "Book borrowed successfully! Due date: " +
          utils.formatDate(data.due_date),
        "success"
      );

      // Refresh borrowed books
      loadBorrowedBooks();

      // Refresh dashboard data
      loadDashboardData();

      // Close modal if open
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("bookDetailsModal")
      );
      if (modal) {
        modal.hide();
      }
    } else {
      utils.showNotification(data.error || "Failed to borrow book", "danger");
    }
  } catch (error) {
    console.error("Error borrowing book:", error);
    utils.showNotification(
      "An error occurred while borrowing the book",
      "danger"
    );
  }
}

// Return book
async function returnBook(borrowId) {
  try {
    const response = await utils.fetchWithAuth(
      `/api/student/return-book/${borrowId}`,
      {
        method: "POST",
      }
    );

    if (response.ok) {
      const data = await response.json();
      utils.showNotification(
        data.message || "Book returned successfully",
        "success"
      );

      // Reload borrowed books
      loadBorrowedBooks();

      // Refresh dashboard data
      loadDashboardData();
    } else {
      const errorData = await response.json();
      utils.showNotification(
        errorData.error || "Failed to return book",
        "danger"
      );
    }
  } catch (error) {
    utils.handleApiError(error);
  }
}
