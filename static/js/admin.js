// Admin Dashboard JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Initialize sidebar functionality
  initializeSidebar();

  // Initialize tabs
  utils.initTabs();

  // Check authentication
  const auth = utils.checkAuth();
  if (!auth || auth.role !== "admin") {
    window.location.href = "/login";
    return;
  }

  // Load dashboard data
  loadDashboardData();

  // Add event listener for search button and input
  const searchBtn = document.getElementById("searchBookBtn");
  const searchInput = document.getElementById("bookSearchInput");

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      loadBooks(1, 10, searchInput.value);
    });

    // Add enter key support for search
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        loadBooks(1, 10, searchInput.value);
      }
    });
  }

  // Load books when tab is clicked or if books tab is active
  const booksTab = document.querySelector('a[href="#books-tab"]');
  if (booksTab) {
    booksTab.addEventListener("click", function () {
      loadBooks();
    });

    // If books tab is active on page load, load the books
    if (booksTab.classList.contains("active")) {
      loadBooks();
    }
  }

  // Load initial data if books tab is active
  const activeTab = document.querySelector(".tab-pane.active");
  if (activeTab && activeTab.id === "books-tab") {
    loadBooks();
  }

  // Load students when tab is clicked
  const studentsTab = document.querySelector('a[href="#students-tab"]');
  if (studentsTab) {
    studentsTab.addEventListener("click", function () {
      loadStudents();
    });
  }

  // Student search functionality
  const studentSearchInput = document.getElementById("studentSearchInput");
  const searchStudentBtn = document.getElementById("searchStudentBtn");

  if (studentSearchInput && searchStudentBtn) {
    // Search button click
    searchStudentBtn.addEventListener("click", () => {
      loadStudents(1, 10, studentSearchInput.value);
    });

    // Enter key press in search input
    studentSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        loadStudents(1, 10, studentSearchInput.value);
      }
    });

    // Real-time search with debounce
    let searchTimeout;
    studentSearchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadStudents(1, 10, studentSearchInput.value);
      }, 300);
    });
  }

  // Load students if students tab is active
  if (studentsTab && studentsTab.classList.contains("active")) {
    loadStudents();
  }

  // Load borrowed books when tab is clicked
  const borrowedTab = document.querySelector('a[href="#borrowed-tab"]');
  if (borrowedTab) {
    borrowedTab.addEventListener("click", function () {
      loadBorrowedBooks();
    });
  }

  // Add book form submission
  const addBookForm = document.getElementById("addBookForm");
  if (addBookForm) {
    addBookForm.addEventListener("submit", function (e) {
      e.preventDefault();
      addBook();
    });
  }

  // Add event listeners for modal actions
  document.addEventListener("click", function (e) {
    // Edit book button
    if (
      e.target.classList.contains("edit-book") ||
      e.target.closest(".edit-book")
    ) {
      const button = e.target.classList.contains("edit-book")
        ? e.target
        : e.target.closest(".edit-book");
      const isbn = button.getAttribute("data-isbn");
      editBook(isbn);
    }

    // Delete book button
    if (
      e.target.classList.contains("delete-book") ||
      e.target.closest(".delete-book")
    ) {
      const button = e.target.classList.contains("delete-book")
        ? e.target
        : e.target.closest(".delete-book");
      const isbn = button.getAttribute("data-isbn");
      confirmDeleteBook(isbn);
    }
  });

  // Confirm delete book button
  const confirmDeleteBookBtn = document.getElementById("confirmDeleteBook");
  if (confirmDeleteBookBtn) {
    confirmDeleteBookBtn.addEventListener("click", function () {
      const isbn = this.getAttribute("data-isbn");
      deleteBook(isbn);
    });
  }

  // Add event listener for the Save Book button
  const saveBookBtn = document.getElementById("saveBookBtn");
  if (saveBookBtn) {
    saveBookBtn.addEventListener("click", function () {
      const isbn = document.getElementById("isbn");
      if (isbn && isbn.readOnly) {
        // If ISBN is readonly, we're editing
        updateBook();
      } else {
        // Otherwise, we're adding a new book
        addBook();
      }
    });
  }

  // Add event listener for modal close to reset the form
  const addBookModal = document.getElementById("addBookModal");
  if (addBookModal) {
    addBookModal.addEventListener("hidden.bs.modal", function () {
      resetBookForm();
    });
  }

  // Add event listener for Add New Book button
  const addNewBookBtn = document.querySelector(
    'button[data-bs-target="#addBookModal"]'
  );
  if (addNewBookBtn) {
    addNewBookBtn.addEventListener("click", function () {
      // Reset the form when opening the modal
      resetBookForm();

      // Ensure save button uses addBook function
      const saveBookBtn = document.getElementById("saveBookBtn");
      if (saveBookBtn) {
        saveBookBtn.textContent = "Save Book";
        saveBookBtn.onclick = addBook;
      }
    });
  }

  // Borrowed books filter functionality
  const borrowFilterStatus = document.getElementById("borrowFilterStatus");
  const borrowSearchInput = document.getElementById("borrowSearchInput");
  const searchBorrowBtn = document.getElementById("searchBorrowBtn");

  if (borrowFilterStatus && borrowSearchInput && searchBorrowBtn) {
    // Filter button click
    searchBorrowBtn.addEventListener("click", () => {
      loadBorrowedBooks(1, 10);
    });

    // Status filter change
    borrowFilterStatus.addEventListener("change", () => {
      loadBorrowedBooks(1, 10);
    });

    // Search input enter key
    borrowSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        loadBorrowedBooks(1, 10);
      }
    });

    // Real-time search with debounce
    let searchTimeout;
    borrowSearchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadBorrowedBooks(1, 10);
      }, 300);
    });
  }

  // Load borrowed books if borrowed tab is active
  if (borrowedTab && borrowedTab.classList.contains("active")) {
    loadBorrowedBooks();
  }
});

// Load dashboard data
async function loadDashboardData() {
  // Set loading state
  const dashboardElements = [
    "totalBooks",
    "totalStudents",
    "totalBorrowed",
    "overdueBooks",
  ];
  dashboardElements.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
    }
  });

  try {
    const response = await utils.fetchWithAuth("/api/admin/dashboard-stats");
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const data = await response.json();

    // Update dashboard cards with proper error checking
    const elements = {
      totalBooks: {
        value: data.total_books,
        format: (val) => {
          const num = parseInt(val);
          if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
          if (num >= 1000) return (num / 1000).toFixed(1) + "k";
          return num.toLocaleString();
        },
      },
      totalStudents: {
        value: data.total_students,
        format: (val) => parseInt(val).toLocaleString(),
      },
      totalBorrowed: {
        value: data.total_borrowed,
        format: (val) => parseInt(val).toLocaleString(),
      },
      overdueBooks: {
        value: data.overdue_books,
        format: (val) => parseInt(val).toLocaleString(),
      },
    };

    // Update each element with proper formatting
    Object.entries(elements).forEach(([id, config]) => {
      const element = document.getElementById(id);
      if (element) {
        if (config.value === undefined || config.value === null) {
          element.innerHTML = '<span class="text-danger">Error</span>';
        } else {
          element.textContent = config.format(config.value);
        }
      }
    });

    // Update admin info
    const adminInfo = utils.checkAuth();
    if (adminInfo) {
      const adminNameElement = document.getElementById("adminName");
      const adminEmailElement = document.getElementById("adminEmail");
      if (adminNameElement) {
        adminNameElement.textContent = adminInfo.name || "Admin";
      }
      if (adminEmailElement) {
        adminEmailElement.textContent = adminInfo.email || "";
      }
    }

    // Load charts and recent activities
    await Promise.all([
      loadBorrowingChart(),
      loadPopularBooksChart(),
      loadRecentActivities(),
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);

    // Show error state in dashboard cards
    dashboardElements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML =
          '<span class="text-danger">Error loading data</span>';
      }
    });

    utils.showNotification(
      "Error loading dashboard data. Please try again.",
      "danger"
    );
  }
}

// Load borrowing chart
async function loadBorrowingChart() {
  try {
    const response = await utils.fetchWithAuth("/api/admin/borrowing-trends");
    if (!response.ok) {
      throw new Error("Failed to fetch borrowing trends");
    }
    const data = await response.json();

    const chartCanvas = document.getElementById("borrowingTrendsChart");
    if (!chartCanvas) {
      console.error("Borrowing trends chart canvas not found");
      return;
    }

    const ctx = chartCanvas.getContext("2d");

    // Destroy existing chart if it exists
    if (window.borrowingChart instanceof Chart) {
      window.borrowingChart.destroy();
    }

    // Default data if API response is empty
    const chartData = {
      labels: data.labels || [
        "Week 1",
        "Week 2",
        "Week 3",
        "Week 4",
        "Week 5",
        "Week 6",
        "Week 7",
        "Week 8",
      ],
      borrowed: data.borrowed || [0, 0, 0, 0, 0, 0, 0, 0],
      returned: data.returned || [0, 0, 0, 0, 0, 0, 0, 0],
    };

    // Function to shorten date labels
    const shortenLabel = (label) => {
      if (!label) return "";
      const parts = label.split(" - ");
      if (parts.length === 2) {
        // Format: "01 Mar - 07 Mar" to "01-07 Mar"
        const [start, end] = parts;
        const startDay = start.split(" ")[0];
        const endDay = end.split(" ")[0];
        const month = end.split(" ")[1];
        return `${startDay}-${endDay} ${month}`;
      }
      return label;
    };

    window.borrowingChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.labels.map(shortenLabel),
        datasets: [
          {
            label: "Books Borrowed",
            data: chartData.borrowed,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "rgba(75, 192, 192, 1)",
          },
          {
            label: "Books Returned",
            data: chartData.returned,
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "rgba(255, 99, 132, 1)",
          },
        ],
      },
      options: {
        ...commonChartOptions,
        scales: {
          ...commonChartOptions.scales,
          y: {
            ...commonChartOptions.scales.y,
            ticks: {
              ...commonChartOptions.scales.y.ticks,
              callback: function (value) {
                return value + " books";
              },
            },
          },
        },
        plugins: {
          ...commonChartOptions.plugins,
          title: {
            ...commonChartOptions.plugins.title,
            text: "Weekly Borrowing Trends",
          },
        },
      },
    });

    // Make chart container responsive with increased size
    const chartContainer = chartCanvas.parentElement;
    applyChartContainerStyles(chartContainer);
  } catch (error) {
    console.error("Error loading borrowing chart:", error);
    utils.showNotification("Error loading borrowing trends", "danger");
  }
}

// Load popular books chart
async function loadPopularBooksChart() {
  try {
    const response = await utils.fetchWithAuth("/api/books/popular");
    if (!response.ok) {
      throw new Error("Failed to fetch popular books");
    }
    const data = await response.json();

    const chartCanvas = document.getElementById("bookCategoriesChart");
    if (!chartCanvas) {
      console.error("Popular books chart canvas not found");
      return;
    }

    const ctx = chartCanvas.getContext("2d");

    // Destroy existing chart if it exists
    if (window.popularBooksChart instanceof Chart) {
      window.popularBooksChart.destroy();
    }

    // Default data if API response is empty
    const topBooks = (data.books || []).slice(0, 5);
    if (topBooks.length === 0) {
      topBooks.push({
        title: "No Data",
        rating: 0,
        votes: 0,
      });
    }

    // Function to shorten book titles
    const shortenTitle = (title) => {
      if (!title) return "";
      if (title.length > 20) {
        return title.substring(0, 17) + "...";
      }
      return title;
    };

    window.popularBooksChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: topBooks.map((book) => shortenTitle(book.title)),
        datasets: [
          {
            label: "Average Rating",
            data: topBooks.map((book) => book.rating || 0),
            backgroundColor: "rgba(54, 162, 235, 0.7)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            yAxisID: "y",
            borderRadius: 5,
            barPercentage: 0.7,
            categoryPercentage: 0.7,
          },
          {
            label: "Number of Ratings",
            data: topBooks.map((book) => book.votes || 0),
            backgroundColor: "rgba(255, 99, 132, 0.7)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            yAxisID: "y1",
            borderRadius: 5,
            barPercentage: 0.7,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        ...commonChartOptions,
        scales: {
          ...commonChartOptions.scales,
          y: {
            ...commonChartOptions.scales.y,
            max: 10,
            ticks: {
              ...commonChartOptions.scales.y.ticks,
              stepSize: 2,
              callback: function (value) {
                return value.toFixed(0);
              },
            },
          },
          y1: {
            position: "right",
            beginAtZero: true,
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 9,
              },
              color: "#666",
              callback: function (value) {
                return value >= 1000 ? (value / 1000).toFixed(1) + "k" : value;
              },
            },
          },
        },
        plugins: {
          ...commonChartOptions.plugins,
          title: {
            ...commonChartOptions.plugins.title,
            text: "Popular Books Rating Analysis",
          },
        },
      },
    });

    // Make chart container responsive
    const chartContainer = chartCanvas.parentElement;
    applyChartContainerStyles(chartContainer);
  } catch (error) {
    console.error("Error loading popular books chart:", error);
    const container = document.getElementById(
      "bookCategoriesChart"
    ).parentElement;
    container.innerHTML =
      '<div class="alert alert-danger">Error loading popular books chart</div>';
  }
}

// Load books
async function loadBooks(page = 1, perPage = 10, search = "") {
  try {
    const queryParams = new URLSearchParams({
      page,
      per_page: perPage,
      search,
      order_by: "date_added", // Sort by date added
      order_dir: "desc", // Most recent first
    });

    const response = await utils.fetchWithAuth(
      `/api/admin/books?${queryParams}`
    );
    const data = await response.json();

    if (data.error) {
      utils.showNotification(`Error loading books: ${data.error}`, "error");
      return;
    }

    const tableBody = document.querySelector("#booksTableBody");
    tableBody.innerHTML = "";

    if (!data.books || data.books.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-3">
            <div class="text-muted">
              <i class="fas fa-info-circle me-2"></i>
              No books found
            </div>
          </td>
        </tr>`;
      return;
    }

    // Get current date for comparison to identify new books
    const currentDate = new Date();
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    data.books.forEach((book) => {
      // Default image if none is provided
      const defaultImage = "static/images/default-book.jpg";
      const imageUrl =
        book.image_url_s ||
        book.image_url_m ||
        book.image_url_l ||
        defaultImage;

      // Check if book is recently added (within the last 7 days)
      const isNew = book.date_added
        ? new Date(book.date_added) > sevenDaysAgo
        : false;

      const row = document.createElement("tr");

      // Add a highlight class for new books
      if (isNew) {
        row.classList.add("book-highlight");
      }

      row.innerHTML = `
        <td class="align-middle">${book.isbn}</td>
        <td class="align-middle">
          <div class="d-flex align-items-center">
            <span class="text-truncate" style="max-width: 200px;">${
              book.title
            }</span>
          </div>
                </td>
        <td class="align-middle">${book.author}</td>
        <td class="align-middle">${book.publisher || "N/A"}</td>
        <td class="align-middle">${book.year || "N/A"}</td>
        <td class="align-middle">
          <img src="${imageUrl}" 
               alt="${book.title}" 
               class="book-cover-thumb"
               style="width: 40px; height: 50px; object-fit: cover; border-radius: 4px;"
               onerror="this.src='${defaultImage}'">
        </td>
        <td class="align-middle">
          <div class="btn-group">
            <button class="btn btn-sm btn-primary edit-book" data-isbn="${
              book.isbn
            }">
                        <i class="fas fa-edit"></i>
                    </button>
            <button class="btn btn-sm btn-danger delete-book ms-1" data-isbn="${
              book.isbn
            }">
                        <i class="fas fa-trash"></i>
                    </button>
          </div>
                </td>
            `;
      tableBody.appendChild(row);

      // Add event listeners directly to the buttons in this row
      const editBtn = row.querySelector(".edit-book");
      const deleteBtn = row.querySelector(".delete-book");

      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        editBook(book.isbn);
      });

      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        confirmDeleteBook(book.isbn);
      });
    });

    // Update pagination
    updatePagination(data.pagination);

    // Add a style for the new book highlight if not already present
    if (!document.getElementById("book-highlight-style")) {
      const style = document.createElement("style");
      style.id = "book-highlight-style";
      style.textContent = `
        .book-highlight {
          background-color: rgba(25, 135, 84, 0.05);
          transition: background-color 0.3s ease;
        }
        .book-highlight:hover {
          background-color: rgba(25, 135, 84, 0.1);
        }
      `;
      document.head.appendChild(style);
    }
  } catch (error) {
    console.error("Error loading books:", error);
    utils.showNotification("Failed to load books. Please try again.", "error");
  }
}

// Update pagination controls
function updatePagination(pagination) {
  const paginationElement = document.querySelector("#booksPagination");
  if (!paginationElement) return;

  paginationElement.innerHTML = "";
  paginationElement.className =
    "pagination pagination-sm justify-content-center mt-3 gap-2";

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${pagination.page <= 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `
    <a class="page-link rounded-circle border-0 bg-light px-2 py-1 shadow-sm d-flex align-items-center justify-content-center" 
       href="#" 
       data-page="${pagination.page - 1}"
       style="width: 32px; height: 32px;">
      <i class="fas fa-chevron-left fa-sm"></i>
    </a>`;
  paginationElement.appendChild(prevLi);

  // Calculate visible page range
  let startPage = Math.max(1, pagination.page - 1);
  let endPage = Math.min(pagination.pages, startPage + 2);

  // Adjust start page if we're near the end
  if (endPage - startPage < 2) {
    startPage = Math.max(1, endPage - 2);
  }

  // First page and ellipsis if needed
  if (startPage > 1) {
    const firstLi = document.createElement("li");
    firstLi.className = "page-item";
    firstLi.innerHTML = `
      <a class="page-link rounded-circle border-0 bg-light px-2 py-1 shadow-sm d-flex align-items-center justify-content-center" 
         href="#" 
         data-page="1"
         style="width: 32px; height: 32px;">1</a>`;
    paginationElement.appendChild(firstLi);

    if (startPage > 2) {
      const ellipsisLi = document.createElement("li");
      ellipsisLi.className = "page-item disabled";
      ellipsisLi.innerHTML = `
        <span class="page-link border-0 bg-transparent px-1 py-1 d-flex align-items-center justify-content-center">
          <i class="fas fa-ellipsis-h fa-sm text-secondary"></i>
        </span>`;
      paginationElement.appendChild(ellipsisLi);
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement("li");
    pageLi.className = `page-item ${pagination.page === i ? "active" : ""}`;
    pageLi.innerHTML = `
      <a class="page-link rounded-circle border-0 ${
        i === pagination.page
          ? "bg-primary text-white"
          : "bg-light text-secondary"
      } 
         px-2 py-1 shadow-sm d-flex align-items-center justify-content-center" 
         href="#" 
         data-page="${i}"
         style="width: 32px; height: 32px;">
         ${i}
      </a>`;
    paginationElement.appendChild(pageLi);
  }

  // Last page and ellipsis if needed
  if (endPage < pagination.pages) {
    if (endPage < pagination.pages - 1) {
      const ellipsisLi = document.createElement("li");
      ellipsisLi.className = "page-item disabled";
      ellipsisLi.innerHTML = `
        <span class="page-link border-0 bg-transparent px-1 py-1 d-flex align-items-center justify-content-center">
          <i class="fas fa-ellipsis-h fa-sm text-secondary"></i>
        </span>`;
      paginationElement.appendChild(ellipsisLi);
    }

    const lastLi = document.createElement("li");
    lastLi.className = "page-item";
    lastLi.innerHTML = `
      <a class="page-link rounded-circle border-0 bg-light px-2 py-1 shadow-sm d-flex align-items-center justify-content-center" 
         href="#" 
         data-page="${pagination.pages}"
         style="width: 32px; height: 32px;">${pagination.pages}</a>`;
    paginationElement.appendChild(lastLi);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${
    pagination.page >= pagination.pages ? "disabled" : ""
  }`;
  nextLi.innerHTML = `
    <a class="page-link rounded-circle border-0 bg-light px-2 py-1 shadow-sm d-flex align-items-center justify-content-center" 
       href="#" 
       data-page="${pagination.page + 1}"
       style="width: 32px; height: 32px;">
      <i class="fas fa-chevron-right fa-sm"></i>
    </a>`;
  paginationElement.appendChild(nextLi);

  // Add event listeners with hover effects
  paginationElement.querySelectorAll(".page-link").forEach((link) => {
    if (!link.parentElement.classList.contains("disabled")) {
      // Add hover effect
      link.addEventListener("mouseenter", () => {
        if (!link.classList.contains("bg-primary")) {
          link.classList.remove("bg-light");
          link.classList.add("bg-gray-200");
        }
      });

      link.addEventListener("mouseleave", () => {
        if (!link.classList.contains("bg-primary")) {
          link.classList.remove("bg-gray-200");
          link.classList.add("bg-light");
        }
      });

      // Click event
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = parseInt(link.getAttribute("data-page"));
        if (!isNaN(page)) {
          const searchInput = document.querySelector("#bookSearchInput");
          const searchTerm = searchInput ? searchInput.value : "";
          loadBooks(page, pagination.per_page, searchTerm);
        }
      });
    }
  });
}

// Filter books
function filterBooks(searchTerm) {
  const rows = document.querySelectorAll("#booksTableBody tr");

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Add book
async function addBook() {
  try {
    const isbn = document.getElementById("isbn").value;

    // First check if a book with this ISBN already exists
    try {
      const checkResponse = await utils.fetchWithAuth(`/api/books/${isbn}`);
      // If we get a 200 response, the book exists
      if (checkResponse.status === 200) {
        utils.showNotification(
          "A book with this ISBN already exists. Please use a different ISBN or edit the existing book.",
          "error"
        );
        return;
      }

      // We expect a 404 for non-existent books
      if (checkResponse.status !== 404) {
        console.log(`Unexpected status checking ISBN: ${checkResponse.status}`);
      }

      // Continue with adding the book if we got here
      console.log("Book doesn't exist, proceeding with add");
    } catch (checkError) {
      // An error might mean the book doesn't exist (404) or there's a network issue
      // We'll proceed anyway, as the actual add operation will catch duplicates
      console.log(
        "Error checking book existence, proceeding with add:",
        checkError
      );
    }

    // Function to check and process image URLs
    function processImageUrl(url) {
      if (!url) return "";

      // Check if it's a base64 image
      if (url.startsWith("data:image")) {
        // Return empty string or a placeholder URL for base64 images
        // since they're too large for the database
        utils.showNotification(
          "Base64 image data is too large. Please provide a URL to an image instead.",
          "warning"
        );
        return "";
      }

      // If it's a regular URL, ensure it's not too long
      if (url.length > 250) {
        utils.showNotification(
          `Image URL too long, truncating: ${url.substring(0, 30)}...`,
          "warning"
        );
        return url.substring(0, 250);
      }

      return url;
    }

    const formData = {
      isbn: isbn,
      title: document.getElementById("title").value,
      author: document.getElementById("author").value,
      year: document.getElementById("year").value,
      publisher: document.getElementById("publisher").value,
      image_url_s: processImageUrl(document.getElementById("imageUrlS").value),
      image_url_m: processImageUrl(document.getElementById("imageUrlM").value),
      image_url_l: processImageUrl(document.getElementById("imageUrlL").value),
    };

    // Validate required fields
    if (
      !formData.title ||
      !formData.author ||
      !formData.year ||
      !formData.publisher
    ) {
      utils.showNotification("Please fill in all required fields", "error");
      return;
    }

    const response = await utils.fetchWithAuth("/api/admin/books/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      // Show success message
      utils.showNotification("Book added successfully", "success");

      // Reset the form and close the modal - with error handling
      try {
        // First try to close modal
        const modalElement = document.getElementById("addBookModal");
        if (modalElement) {
          try {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
              modalInstance.hide();
            }
          } catch (modalError) {
            console.error("Error closing modal:", modalError);
            // Fallback direct DOM manipulation
            modalElement.classList.remove("show");
            modalElement.style.display = "none";
            document.body.classList.remove("modal-open");
            const backdrops = document.querySelectorAll(".modal-backdrop");
            backdrops.forEach((backdrop) => {
              backdrop.parentNode.removeChild(backdrop);
            });
          }
        }

        // Then reset the form
        resetBookForm();

        // Finally refresh the books list
        loadBooks();
      } catch (uiError) {
        console.error("UI update error:", uiError);
        // If UI update fails, try reload as last resort
        alert(
          "Book added successfully but there was an issue refreshing the UI. The page will reload."
        );
        window.location.reload();
      }
    } else {
      // If there's a duplicate ISBN error, show a more specific message
      if (result.error && result.error.includes("Duplicate entry")) {
        utils.showNotification(
          "A book with this ISBN already exists. Please use a different ISBN.",
          "error"
        );
      } else if (result.error && result.error.includes("Data too long")) {
        utils.showNotification(
          "One of the image URLs is too long for the database. Please use a shorter URL.",
          "error"
        );
      } else {
        utils.showNotification(result.error || "Failed to add book", "error");
      }
    }
  } catch (error) {
    console.error("Error in addBook:", error);
    utils.showNotification("Failed to add book", "error");
    // If there's a critical error, give option to reload
    if (
      confirm(
        "There was an error adding the book. Would you like to refresh the page?"
      )
    ) {
      window.location.reload();
    }
  }
}

// Edit book
async function editBook(isbn) {
  try {
    // Use the correct API endpoint for fetching book details
    const response = await utils.fetchWithAuth(`/api/books/${isbn}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Failed to load book details";

      try {
        // Try to parse error as JSON
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // If not JSON, use the raw text if available
        if (errorText) errorMessage = errorText;
      }

      utils.showNotification(errorMessage, "error");
      return;
    }

    // Try to parse the response
    let book;
    try {
      book = await response.json();
    } catch (parseError) {
      console.error("Error parsing book data:", parseError);
      utils.showNotification("Invalid data received from server", "error");
      return;
    }

    // Ensure book data is valid
    if (!book || !book.isbn) {
      utils.showNotification("Invalid book data received", "error");
      return;
    }

    // Populate the edit modal with book data
    document.getElementById("isbn").value = book.isbn;
    document.getElementById("isbn").readOnly = true; // ISBN shouldn't be editable
    document.getElementById("title").value = book.title || "";
    document.getElementById("author").value = book.author || "";
    document.getElementById("year").value = book.year || "";
    document.getElementById("publisher").value = book.publisher || "";
    document.getElementById("imageUrlS").value = book.image_url_s || "";
    document.getElementById("imageUrlM").value = book.image_url_m || "";
    document.getElementById("imageUrlL").value = book.image_url_l || "";

    // Show the modal
    try {
      const modalElement = document.getElementById("addBookModal");
      if (!modalElement) {
        throw new Error("Modal element not found");
      }

      // Try to create and show modal using Bootstrap
      try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      } catch (modalError) {
        console.error("Error showing modal with Bootstrap:", modalError);
        // Fallback: direct DOM manipulation
        modalElement.classList.add("show");
        modalElement.style.display = "block";
        document.body.classList.add("modal-open");

        // Add backdrop if needed
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop fade show";
        document.body.appendChild(backdrop);
      }

      // Update the save button to handle edit
      const saveBtn = document.getElementById("saveBookBtn");
      if (saveBtn) {
        saveBtn.textContent = "Update Book";

        // Remove old event handlers and add new one
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener("click", updateBook);
      }
    } catch (uiError) {
      console.error("Error setting up edit UI:", uiError);
      utils.showNotification(
        "Failed to open edit form. Please try again.",
        "error"
      );
    }
  } catch (error) {
    console.error("Error in editBook:", error);
    utils.showNotification(
      "Failed to load book details. Please try again.",
      "error"
    );
  }
}

// Update book
async function updateBook() {
  try {
    const isbn = document.getElementById("isbn").value;

    // Function to check and process image URLs
    function processImageUrl(url) {
      if (!url) return "";

      // Check if it's a base64 image
      if (url.startsWith("data:image")) {
        // Return empty string or a placeholder URL for base64 images
        // since they're too large for the database
        utils.showNotification(
          "Base64 image data is too large. Please provide a URL to an image instead.",
          "warning"
        );
        return "";
      }

      // If it's a regular URL, ensure it's not too long
      if (url.length > 250) {
        utils.showNotification(
          `Image URL too long, truncating: ${url.substring(0, 30)}...`,
          "warning"
        );
        return url.substring(0, 250);
      }

      return url;
    }

    const bookData = {
      title: document.getElementById("title").value,
      author: document.getElementById("author").value,
      year: document.getElementById("year").value,
      publisher: document.getElementById("publisher").value,
      image_url_s: processImageUrl(
        document.getElementById("imageUrlS").value || ""
      ),
      image_url_m: processImageUrl(
        document.getElementById("imageUrlM").value || ""
      ),
      image_url_l: processImageUrl(
        document.getElementById("imageUrlL").value || ""
      ),
    };

    // Validate required fields
    if (
      !bookData.title ||
      !bookData.author ||
      !bookData.year ||
      !bookData.publisher
    ) {
      utils.showNotification("Please fill in all required fields", "error");
      return;
    }

    // Use the correct API endpoint for updating a book
    const response = await utils.fetchWithAuth(
      `/api/admin/books/edit/${isbn}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookData),
      }
    );

    const result = await response.json();

    if (response.ok) {
      // Show success message
      utils.showNotification("Book updated successfully", "success");

      // Reset the form and close the modal - with error handling
      try {
        // First try to close modal
        const modalElement = document.getElementById("addBookModal");
        if (modalElement) {
          try {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
              modalInstance.hide();
            }
          } catch (modalError) {
            console.error("Error closing modal:", modalError);
            modalElement.classList.remove("show");
            modalElement.style.display = "none";
            document.body.classList.remove("modal-open");
            const backdrops = document.querySelectorAll(".modal-backdrop");
            backdrops.forEach((backdrop) => {
              backdrop.parentNode.removeChild(backdrop);
            });
          }
        }

        // Then reset the form
        resetBookForm();

        // Finally refresh the books list
        loadBooks();
      } catch (uiError) {
        console.error("UI update error:", uiError);
        // If UI update fails, try reload as last resort
        alert(
          "Book updated successfully but there was an issue refreshing the UI. The page will reload."
        );
        window.location.reload();
      }
    } else {
      utils.showNotification(result.error || "Failed to update book", "error");
    }
  } catch (error) {
    console.error("Error in updateBook:", error);
    utils.showNotification("Failed to update book", "error");
    // If there's a critical error, give option to reload
    if (
      confirm(
        "There was an error updating the book. Would you like to refresh the page?"
      )
    ) {
      window.location.reload();
    }
  }
}

// Reset book form to default state
function resetBookForm() {
  try {
    // Reset the form fields
    const form = document.getElementById("addBookForm");
    if (form) {
      form.reset();
    }

    // Make ISBN field editable again
    const isbnField = document.getElementById("isbn");
    if (isbnField) {
      isbnField.readOnly = false;
    }

    // Reset the save button to default state
    const saveBookBtn = document.getElementById("saveBookBtn");
    if (saveBookBtn) {
      saveBookBtn.textContent = "Save Book";
      // Clear previous onclick handlers
      const newBtn = saveBookBtn.cloneNode(true);
      saveBookBtn.parentNode.replaceChild(newBtn, saveBookBtn);

      // Set new click handler
      newBtn.addEventListener("click", addBook);
    }

    // Force close any open modal
    const modalElement = document.getElementById("addBookModal");
    if (modalElement) {
      // Try Bootstrap 5 way
      try {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      } catch (err) {
        console.log(
          "Could not close modal with Bootstrap API, trying jQuery..."
        );
        // Try direct DOM manipulation as fallback
        modalElement.classList.remove("show");
        modalElement.style.display = "none";
        document.body.classList.remove("modal-open");
        const backdrops = document.querySelectorAll(".modal-backdrop");
        backdrops.forEach((backdrop) => {
          backdrop.parentNode.removeChild(backdrop);
        });
      }
    }
  } catch (error) {
    console.error("Error in resetBookForm:", error);
    // Force page reload as a last resort if there's an error
    if (
      confirm(
        "There was an error resetting the form. Would you like to refresh the page?"
      )
    ) {
      window.location.reload();
    }
  }
}

// Delete book
async function deleteBook(isbn) {
  try {
    const response = await utils.fetchWithAuth(
      `/api/admin/books/delete/${isbn}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (response.ok) {
      utils.showNotification("Book deleted successfully", "success");
      loadBooks(); // Refresh the books list
    } else {
      // Check if it's a foreign key constraint error
      if (
        result.error &&
        result.error.includes("foreign key constraint fails")
      ) {
        // Show a confirmation dialog
        if (
          confirm(
            "This book has ratings associated with it. Do you want to delete the book and all its ratings?"
          )
        ) {
          // Call the cascade delete endpoint
          const cascadeResponse = await utils.fetchWithAuth(
            `/api/admin/books/delete/${isbn}?cascade=true`,
            {
              method: "DELETE",
            }
          );
          const cascadeResult = await cascadeResponse.json();

          if (cascadeResponse.ok) {
            utils.showNotification(
              "Book and associated ratings deleted successfully",
              "success"
            );
            loadBooks(); // Refresh the books list
          } else {
            utils.showNotification(
              cascadeResult.error || "Failed to delete book and ratings",
              "error"
            );
          }
        }
      } else {
        utils.showNotification(
          result.error || "Failed to delete book",
          "error"
        );
      }
    }
  } catch (error) {
    console.error("Error in deleteBook:", error);
    utils.showNotification("Failed to delete book", "error");
  }
}

// Confirm delete
function confirmDeleteBook(isbn) {
  if (confirm("Are you sure you want to delete this book?")) {
    deleteBook(isbn);
  }
}

// Load students
async function loadStudents(page = 1, perPage = 10, search = "") {
  try {
    const queryParams = new URLSearchParams({
      page,
      per_page: perPage,
      search,
    });

    const response = await utils.fetchWithAuth(
      `/api/admin/students?${queryParams}`
    );
    const data = await response.json();

    const studentsTableBody = document.getElementById("studentsTableBody");
    studentsTableBody.innerHTML = "";

    if (!data.students || data.students.length === 0) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-3">
            <div class="text-muted">
              <i class="fas fa-info-circle me-2"></i>
              No students found
            </div>
          </td>
        </tr>`;
      return;
    }

    data.students.forEach((student) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="align-middle">${student.user_id}</td>
        <td class="align-middle">${student.name}</td>
        <td class="align-middle">${student.email}</td>
        <td class="align-middle">${utils.formatDate(student.created_at)}</td>
        <td class="align-middle text-center">${student.books_borrowed || 0}</td>
        <td class="align-middle">
          <button class="btn btn-primary btn-sm view-details" data-student-id="${
            student.user_id
          }">
            <i class="fas fa-eye me-1"></i> View Details
                    </button>
                </td>
            `;

      studentsTableBody.appendChild(row);
    });

    // Add event listeners to all View Details buttons
    studentsTableBody.querySelectorAll(".view-details").forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        const studentId = button.getAttribute("data-student-id");
        if (studentId) {
          try {
            // Show loading state
            button.disabled = true;
            button.innerHTML =
              '<i class="fas fa-spinner fa-spin me-1"></i> Loading...';

            await viewStudentDetails(studentId);
          } catch (error) {
            console.error("Error viewing student details:", error);
            utils.showNotification("Failed to load student details", "error");
          } finally {
            // Reset button state
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-eye me-1"></i> View Details';
          }
        }
      });
    });

    // Update pagination
    const paginationElement = document.getElementById("studentsPagination");
    if (paginationElement) {
      paginationElement.innerHTML = "";
      if (data.pagination && data.pagination.total_pages > 1) {
        paginationElement.appendChild(
          utils.createPagination(
            page,
            data.pagination.total_pages,
            (newPage) => {
              loadStudents(newPage, perPage, search);
            }
          )
        );
      }
    }
  } catch (error) {
    console.error("Error loading students:", error);
    utils.showNotification(
      "Failed to load students. Please try again.",
      "error"
    );
  }
}

// View student details
async function viewStudentDetails(studentId) {
  try {
    // Fetch student details
    const studentResponse = await utils.fetchWithAuth(
      `/api/admin/students/${studentId}`
    );
    const student = await studentResponse.json();

    // Fetch student's borrowed books
    const borrowedResponse = await utils.fetchWithAuth(
      `/api/admin/student/${studentId}/borrowed-books`
    );
    const borrowedData = await borrowedResponse.json();

    // Create and show modal
    const modalHtml = `
      <div class="modal fade" id="studentDetailsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Student Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row mb-4">
                <div class="col-md-6">
                  <h6 class="mb-2">Personal Information</h6>
                  <p><strong>Name:</strong> ${student.name}</p>
                  <p><strong>Email:</strong> ${student.email}</p>
                  <p><strong>ID:</strong> ${student.user_id}</p>
                  <p><strong>Joined:</strong> ${utils.formatDate(
                    student.created_at
                  )}</p>
                </div>
                <div class="col-md-6">
                  <h6 class="mb-2">Borrowing Statistics</h6>
                  <p><strong>Total Books Borrowed:</strong> ${
                    borrowedData.borrowed_books.length
                  }</p>
                  <p><strong>Currently Borrowed:</strong> ${
                    borrowedData.borrowed_books.filter(
                      (book) => !book.return_date
                    ).length
                  }</p>
                  <p><strong>Overdue Books:</strong> ${
                    borrowedData.borrowed_books.filter(
                      (book) =>
                        !book.return_date &&
                        new Date(book.due_date) < new Date()
                    ).length
                  }</p>
                </div>
              </div>
              
              <h6 class="mb-3">Borrowed Books History</h6>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Borrow Date</th>
                      <th>Due Date</th>
                      <th>Return Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${borrowedData.borrowed_books
                      .map(
                        (book) => `
                      <tr>
                    <td>${book.book_title}</td>
                    <td>${utils.formatDate(book.borrow_date)}</td>
                    <td>${utils.formatDate(book.due_date)}</td>
                        <td>${
                          book.return_date
                            ? utils.formatDate(book.return_date)
                            : "-"
                        }</td>
                        <td>
                          <span class="badge bg-${
                            book.return_date
                              ? "success"
                              : new Date(book.due_date) < new Date()
                              ? "danger"
                              : "warning"
                          }">
                            ${
                              book.return_date
                                ? "Returned"
                                : new Date(book.due_date) < new Date()
                                ? "Overdue"
                                : "Borrowed"
                            }
                          </span>
                        </td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById("studentDetailsModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Show modal
    const modalElement = document.getElementById("studentDetailsModal");
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Add event listener to remove modal from DOM when hidden
    modalElement.addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
  } catch (error) {
    console.error("Error loading student details:", error);
    utils.showNotification("Failed to load student details", "error");
  }
}

// Filter students
function filterStudents(searchTerm) {
  const searchInput = document.getElementById("studentSearchInput");
  if (searchInput) {
    loadStudents(1, 10, searchInput.value);
  }
}

// Load borrowed books
async function loadBorrowedBooks(page = 1, perPage = 10) {
  try {
    // Get filter values
    const statusFilter = document.getElementById("borrowFilterStatus").value;
    const searchInput = document.getElementById("borrowSearchInput").value;

    // Build query parameters
    const queryParams = new URLSearchParams({
      page,
      per_page: perPage,
      status: statusFilter,
      search: searchInput,
    });

    const response = await utils.fetchWithAuth(
      `/api/admin/borrowed-books?${queryParams}`
    );
    const data = await response.json();

    const borrowedBooksTableBody = document.getElementById(
      "borrowedBooksTableBody"
    );
    borrowedBooksTableBody.innerHTML = "";

    if (!data.borrowed_books || data.borrowed_books.length === 0) {
      borrowedBooksTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-3">
                        <div class="text-muted">
                            <i class="fas fa-info-circle me-2"></i>
                            No borrowed books found
                        </div>
                    </td>
                </tr>`;
      return;
    }

    data.borrowed_books.forEach((book) => {
      const row = document.createElement("tr");
      const statusClass =
        book.status === "Returned"
          ? "success"
          : book.status === "Overdue"
          ? "danger"
          : "warning";

      row.innerHTML = `
                <td class="align-middle">${book.borrow_id}</td>
                <td class="align-middle">
                    <a href="javascript:void(0)" class="view-student" data-student-id="${
                      book.user_id
                    }">
                        ${book.student_name}
                    </a>
                </td>
                <td class="align-middle">${book.book_title}</td>
                <td class="align-middle">${utils.formatDate(
                  book.borrow_date
                )}</td>
                <td class="align-middle">${utils.formatDate(book.due_date)}</td>
                <td class="align-middle">${
                  book.return_date ? utils.formatDate(book.return_date) : "-"
                }</td>
                <td class="align-middle">$${book.fine.toFixed(2)}</td>
                <td class="align-middle">
                    <span class="badge bg-${statusClass}">${book.status}</span>
                </td>
                <td class="align-middle">
                    ${
                      book.status === "Borrowed"
                        ? `
                        <button class="btn btn-success btn-sm mark-returned" data-borrow-id="${book.borrow_id}">
                            <i class="fas fa-check me-1"></i> Mark Returned
                        </button>
                    `
                        : ""
                    }
                </td>
            `;

      // Add event listeners
      const studentLink = row.querySelector(".view-student");
      if (studentLink) {
        studentLink.addEventListener("click", () =>
          viewStudentDetails(book.user_id)
        );
      }

      const returnButton = row.querySelector(".mark-returned");
      if (returnButton) {
        returnButton.addEventListener("click", () =>
          markBookReturned(book.borrow_id)
        );
      }

      borrowedBooksTableBody.appendChild(row);
    });

    // Update pagination
    const paginationElement = document.getElementById("borrowedPagination");
    if (paginationElement) {
      paginationElement.innerHTML = "";
      if (data.pagination && data.pagination.total_pages > 1) {
        paginationElement.appendChild(
          utils.createPagination(
            data.pagination.page,
            data.pagination.total_pages,
            (newPage) => loadBorrowedBooks(newPage, perPage)
          )
        );
      }
    }
  } catch (error) {
    console.error("Error loading borrowed books:", error);
    utils.showNotification(
      "Failed to load borrowed books. Please try again.",
      "error"
    );
  }
}

// Mark book as returned
async function markBookReturned(borrowId) {
  try {
    const response = await utils.fetchWithAuth(
      `/api/admin/borrowed-books/${borrowId}/return`,
      {
        method: "POST",
      }
    );

    if (response.ok) {
      utils.showNotification("Book marked as returned successfully", "success");
      loadBorrowedBooks(); // Refresh the list
    } else {
      const data = await response.json();
      utils.showNotification(
        data.error || "Failed to mark book as returned",
        "error"
      );
    }
  } catch (error) {
    console.error("Error marking book as returned:", error);
    utils.showNotification("Failed to mark book as returned", "error");
  }
}

// Load recent activities
async function loadRecentActivities(page = 1) {
  try {
    const response = await utils.fetchWithAuth("/api/admin/recent-activities");
    if (!response.ok) {
      throw new Error("Failed to fetch recent activities");
    }
    const data = await response.json();

    const activitiesTable = document.querySelector(".table");
    if (activitiesTable) {
      activitiesTable.style.width = "100%";
      activitiesTable.style.borderCollapse = "separate";
      activitiesTable.style.borderSpacing = "0";
      activitiesTable.style.fontSize = "0.875rem"; // Reduce overall table font size
    }

    // Style the table headers
    const headerRow = document.querySelector(".table thead tr");
    if (headerRow) {
      headerRow.style.position = "sticky";
      headerRow.style.top = "0";
      headerRow.style.zIndex = "1";
      headerRow.innerHTML = `
        <th class="px-3 py-2" style="width: 20%; background: linear-gradient(to bottom, #edf2f7, #e2e8f0); font-weight: 600; color: #2d3748; font-size: 0.813rem; border-bottom: 2px solid #cbd5e0;">
          <div class="d-flex align-items-center">
            <i class="fas fa-calendar-alt text-primary me-2"></i>
            Date
          </div>
        </th>
        <th class="px-3 py-2" style="width: 25%; background: linear-gradient(to bottom, #edf2f7, #e2e8f0); font-weight: 600; color: #2d3748; font-size: 0.813rem; border-bottom: 2px solid #cbd5e0;">
          <div class="d-flex align-items-center">
            <i class="fas fa-user text-primary me-2"></i>
            Student
          </div>
        </th>
        <th class="px-3 py-2" style="width: 40%; background: linear-gradient(to bottom, #edf2f7, #e2e8f0); font-weight: 600; color: #2d3748; font-size: 0.813rem; border-bottom: 2px solid #cbd5e0;">
          <div class="d-flex align-items-center">
            <i class="fas fa-book text-primary me-2"></i>
            Book
          </div>
        </th>
        <th class="px-3 py-2 text-center" style="width: 15%; background: linear-gradient(to bottom, #edf2f7, #e2e8f0); font-weight: 600; color: #2d3748; font-size: 0.813rem; border-bottom: 2px solid #cbd5e0;">
          <div class="d-flex align-items-center justify-content-center">
            <i class="fas fa-exchange-alt text-primary me-2"></i>
            Action
          </div>
        </th>
      `;
    }

    const activitiesTableBody = document.getElementById("recentActivities");
    if (!activitiesTableBody) {
      console.error("Recent activities table body not found");
      return;
    }

    activitiesTableBody.innerHTML = "";

    if (!data.activities || data.activities.length === 0) {
      activitiesTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center p-4">
            <div class="text-muted">
              <i class="fas fa-info-circle fa-lg mb-2"></i>
              <p class="mb-0 small">No recent activities found</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    // Calculate pagination
    const itemsPerPage = 10;
    const totalItems = data.activities.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageItems = data.activities.slice(startIndex, endIndex);

    // Show activities for current page
    currentPageItems.forEach((activity, index) => {
      const row = document.createElement("tr");
      const isLastRow = index === currentPageItems.length - 1;
      const statusClass = activity.action === "borrow" ? "warning" : "success";
      const statusIcon =
        activity.action === "borrow" ? "arrow-right" : "arrow-left";
      const statusText = activity.action === "borrow" ? "BORROWED" : "RETURNED";

      // Format the date to be more compact
      const date = new Date(activity.date);
      const formattedDate = date
        .toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .replace(",", "");

      row.className = `align-middle ${
        isLastRow ? "" : "border-bottom border-light"
      }`;
      row.innerHTML = `
        <td class="px-3 py-2" style="width: 20%">
          <div class="d-flex align-items-center">
            <i class="fas fa-clock text-secondary me-2 fa-sm"></i>
            <span class="small">${formattedDate}</span>
          </div>
        </td>
        <td class="px-3 py-2" style="width: 25%">
          <div class="d-flex align-items-center">
            <i class="fas fa-user-circle text-secondary me-2 fa-sm"></i>
            <a href="javascript:void(0)" 
               class="view-student text-decoration-none text-primary small" 
               data-id="${activity.user_id}">
              ${activity.student_name}
            </a>
          </div>
        </td>
        <td class="px-3 py-2" style="width: 40%">
          <div class="d-flex align-items-center">
            <i class="fas fa-book text-secondary me-2 fa-sm"></i>
            <a href="javascript:void(0)" 
               class="view-book text-decoration-none text-primary small" 
               data-isbn="${activity.isbn}"
               style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${activity.book_title}
            </a>
          </div>
        </td>
        <td class="px-3 py-2 text-center" style="width: 15%">
          <span class="badge bg-${statusClass} rounded-pill px-2 py-1" style="min-width: 90px;">
            <i class="fas fa-${statusIcon} fa-sm me-1"></i>
            <span class="small">${statusText}</span>
          </span>
        </td>
      `;

      activitiesTableBody.appendChild(row);
    });

    // Update pagination controls with enhanced styling
    const paginationElement = document.getElementById("activitiesPagination");
    if (paginationElement) {
      paginationElement.className =
        "pagination pagination-sm justify-content-center mt-3 gap-1";
      paginationElement.innerHTML = "";

      if (totalPages > 1) {
        // Previous button
        const prevLi = document.createElement("li");
        prevLi.className = `page-item ${page <= 1 ? "disabled" : ""}`;
        prevLi.innerHTML = `
          <a class="page-link rounded-circle border-0 bg-light px-2 py-1 shadow-sm" 
             href="#" data-page="${page - 1}" 
             style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"
             aria-label="Previous">
            <i class="fas fa-chevron-left fa-sm"></i>
          </a>`;
        paginationElement.appendChild(prevLi);

        // Calculate visible page range
        let startPage = Math.max(1, page - 1);
        let endPage = Math.min(totalPages, startPage + 2);

        // Adjust start page if we're near the end
        if (endPage - startPage < 2) {
          startPage = Math.max(1, endPage - 2);
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
          const pageLi = document.createElement("li");
          pageLi.className = `page-item ${i === page ? "active" : ""}`;
          pageLi.innerHTML = `
            <a class="page-link rounded-circle border-0 ${
              i === page ? "bg-primary text-white" : "bg-light text-secondary"
            } px-2 py-1 shadow-sm" 
               href="#" 
               data-page="${i}"
               style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
               ${i}
            </a>`;
          paginationElement.appendChild(pageLi);
        }

        // Next button
        const nextLi = document.createElement("li");
        nextLi.className = `page-item ${page >= totalPages ? "disabled" : ""}`;
        nextLi.innerHTML = `
          <a class="page-link rounded-circle border-0 bg-light px-2 py-1 shadow-sm" 
             href="#" 
             data-page="${page + 1}"
             style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"
             aria-label="Next">
            <i class="fas fa-chevron-right fa-sm"></i>
          </a>`;
        paginationElement.appendChild(nextLi);

        // Add event listeners to pagination controls
        paginationElement.querySelectorAll(".page-link").forEach((link) => {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            const newPage = parseInt(link.getAttribute("data-page"));
            if (!isNaN(newPage)) {
              loadRecentActivities(newPage);
            }
          });
        });
      }
    }

    // Add event listeners for student and book links
    document.querySelectorAll(".view-student").forEach((link) => {
      link.addEventListener("click", () =>
        viewStudentDetails(link.getAttribute("data-id"))
      );
    });

    document.querySelectorAll(".view-book").forEach((link) => {
      link.addEventListener("click", () =>
        viewBookDetails(link.getAttribute("data-isbn"))
      );
    });
  } catch (error) {
    console.error("Error loading recent activities:", error);
    const activitiesTableBody = document.getElementById("recentActivities");
    if (activitiesTableBody) {
      activitiesTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center p-3">
            <div class="text-danger">
              <i class="fas fa-exclamation-circle fa-lg mb-2"></i>
              <p class="mb-0 small">Error loading activities. Please try again.</p>
            </div>
          </td>
        </tr>`;
    }
  }
}

// Add logout functionality
document.getElementById("logoutBtn").addEventListener("click", function () {
  if (confirm("Are you sure you want to logout?")) {
    // Clear authentication data
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");

    // Redirect to login page
    window.location.href = "/login";
  }
});

// Common chart container styling
const applyChartContainerStyles = (container) => {
  if (container) {
    container.style.height = "180px"; // Reduced from 220px
    container.style.width = "100%";
    container.style.padding = "3px"; // Reduced from 4px
    container.style.maxWidth = "100%";
    container.style.overflow = "hidden";
    container.style.margin = "0";
    container.style.boxSizing = "border-box";
  }
};

// Common chart options for both charts
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      left: 2,
      right: 2,
      top: 2,
      bottom: 2,
    },
  },
  plugins: {
    legend: {
      position: "top",
      align: "start",
      labels: {
        boxWidth: 8, // Reduced from 10
        padding: 4, // Reduced from 6
        font: {
          size: 8, // Reduced from 9
        },
      },
    },
    title: {
      display: true,
      font: {
        size: 10, // Reduced from 12
        weight: "bold",
      },
      padding: {
        top: 2, // Reduced from 4
        bottom: 2, // Reduced from 4
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxRotation: 45,
        minRotation: 45,
        font: {
          size: 7, // Reduced from 8
        },
        color: "#666",
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        font: {
          size: 7, // Reduced from 8
        },
        color: "#666",
      },
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
        drawBorder: false,
      },
    },
  },
};

function initializeSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.querySelector(".toggle-sidebar");
  const mainContent = document.querySelector(".main-content");
  const menuItems = document.querySelectorAll(".sidebar-menu a");

  // Toggle sidebar on button click
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      sidebar.classList.toggle("active");
    });
  }

  // Close sidebar when clicking outside
  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 992) {
      // Only on mobile/tablet
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    }
  });

  // Handle menu item clicks
  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Remove active class from all items
      menuItems.forEach((i) => i.classList.remove("active"));
      // Add active class to clicked item
      this.classList.add("active");

      // Close sidebar on mobile after clicking
      if (window.innerWidth <= 992) {
        sidebar.classList.remove("active");
      }
    });
  });

  // Handle window resize
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth > 992) {
        sidebar.classList.remove("active");
        mainContent.style.marginLeft = "260px";
      } else {
        mainContent.style.marginLeft = "0";
      }
    }, 250);
  });

  // Add hover effect to menu items
  menuItems.forEach((item) => {
    item.addEventListener("mouseenter", function () {
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = "scale(1.1)";
      }
    });

    item.addEventListener("mouseleave", function () {
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = "scale(1)";
      }
    });
  });
}
