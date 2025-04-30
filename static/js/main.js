// Utility functions for Library Management System

// Namespace for utility functions
const utils = {
  // Authentication
  saveToken: function (token, user) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  getToken: function () {
    return localStorage.getItem("authToken");
  },

  removeToken: function () {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  checkAuth: function () {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      // Parse the user from localStorage
      return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
      console.error("Error parsing user data", error);
      this.removeToken();
      return null;
    }
  },

  // API calls with authentication
  fetchWithAuth: async function (url, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    };

    const response = await fetch(url, mergedOptions);

    if (response.status === 401) {
      // Unauthorized, token might be expired
      this.removeToken();
      window.location.href = "/login";
      throw new Error("Authentication failed. Please log in again.");
    }

    return response;
  },

  // Error handling
  handleApiError: function (error) {
    console.error("API Error:", error);

    if (
      error.message === "Authentication required" ||
      error.message.includes("Authentication failed")
    ) {
      this.showNotification("Please log in to continue", "warning");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else {
      this.showNotification(`Error: ${error.message}`, "danger");
    }
  },

  // Notifications
  showNotification: function (message, type = "info") {
    // Check if the notification container exists
    let notifContainer = document.getElementById("notification-container");

    // If not, create it
    if (!notifContainer) {
      notifContainer = document.createElement("div");
      notifContainer.id = "notification-container";
      notifContainer.className = "position-fixed top-0 end-0 p-3";
      notifContainer.style.zIndex = "5000";
      document.body.appendChild(notifContainer);
    }

    // Create notification element
    const notifId = "notification-" + Date.now();
    const notification = document.createElement("div");
    notification.className = `toast align-items-center text-white bg-${type} border-0`;
    notification.id = notifId;
    notification.setAttribute("role", "alert");
    notification.setAttribute("aria-live", "assertive");
    notification.setAttribute("aria-atomic", "true");

    // Create notification content
    notification.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

    // Add to container
    notifContainer.appendChild(notification);

    // Initialize and show the toast
    const toast = new bootstrap.Toast(notification, {
      autohide: true,
      delay: 5000,
    });
    toast.show();

    // Remove after hidden
    notification.addEventListener("hidden.bs.toast", function () {
      notification.remove();
    });
  },

  // Data formatting
  formatDate: function (dateStr) {
    if (!dateStr) return "";

    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  formatDateTime: function (dateStr) {
    if (!dateStr) return "";

    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  truncateText: function (text, length = 100) {
    if (!text) return "";

    if (text.length <= length) return text;

    return text.substring(0, length) + "...";
  },

  // Form handling
  validateForm: function (formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    // Check HTML5 validation
    if (!form.checkValidity()) {
      // Trigger browser validation UI
      form.reportValidity();
      return false;
    }

    return true;
  },

  serializeForm: function (formId) {
    const form = document.getElementById(formId);
    if (!form) return null;

    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  },

  // Initialization
  initTabs: function () {
    // Activate Bootstrap tabs
    const tabElements = document.querySelectorAll('a[data-bs-toggle="tab"]');
    tabElements.forEach((tabEl) => {
      tabEl.addEventListener("click", function (e) {
        e.preventDefault();
        new bootstrap.Tab(this).show();
      });
    });
  },

  // URL params
  getUrlParam: function (param) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(param);
  },

  // Redirect helpers
  redirectToDashboard: function (role) {
    if (role === "admin") {
      window.location.href = "/admin/dashboard";
    } else if (role === "student") {
      window.location.href = "/student/dashboard";
    } else {
      console.error("Unknown role:", role);
      this.showNotification("Unknown user role", "danger");
    }
  },

  // Time-related utilities
  isOverdue: function (dueDate) {
    if (!dueDate) return false;

    const due = new Date(dueDate);
    const now = new Date();

    return due < now;
  },

  // Search utilities
  debounce: function (func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  },

  // Handle API errors
  handleApiError: function (error) {
    console.error("API Error:", error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      this.showNotification(
        error.response.data.error || "An error occurred",
        "danger"
      );
    } else if (error.request) {
      // The request was made but no response was received
      this.showNotification(
        "No response from server. Please try again later.",
        "warning"
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      this.showNotification(
        error.message || "An unexpected error occurred",
        "danger"
      );
    }
  },

  // Show notification
  showNotification: function (message, type = "info") {
    // Check if notification container exists, if not create it
    let container = document.getElementById("notificationContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "notificationContainer";
      container.className = "position-fixed top-0 end-0 p-3";
      container.style.zIndex = "1050";
      document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `toast align-items-center text-white bg-${type} border-0`;
    notification.setAttribute("role", "alert");
    notification.setAttribute("aria-live", "assertive");
    notification.setAttribute("aria-atomic", "true");

    notification.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

    // Add to container
    container.appendChild(notification);

    // Initialize and show toast
    const toast = new bootstrap.Toast(notification, {
      autohide: true,
      delay: 5000,
    });
    toast.show();

    // Remove from DOM after hiding
    notification.addEventListener("hidden.bs.toast", function () {
      notification.remove();
    });
  },

  // Format date
  formatDate: function (dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  // Check if date is overdue
  isOverdue: function (dateString) {
    if (!dateString) return false;

    const dueDate = new Date(dateString);
    if (isNaN(dueDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
  },

  // Create book card
  createBookCard: function (book) {
    const col = document.createElement("div");
    col.className = "col-md-4 col-lg-3 mb-4";

    const imageUrl =
      book.image_url_m ||
      book.image_url_s ||
      "https://via.placeholder.com/150x200?text=No+Image";

    col.innerHTML = `
            <div class="card h-100 book-card">
                <div class="card-img-container">
                    <img src="${imageUrl}" class="card-img-top" alt="${
      book.title
    }" loading="lazy">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${book.title}</h5>
                    <p class="card-text">By ${book.author}</p>
                    <p class="card-text small text-muted">${
                      book.publisher || ""
                    } ${book.year ? "(" + book.year + ")" : ""}</p>
                    <div class="mt-auto">
                        <button class="btn btn-sm btn-primary view-details" data-isbn="${
                          book.isbn
                        }">
                            View Details
                        </button>
                        ${
                          book.is_borrowed === false
                            ? `<button class="btn btn-sm btn-success ms-1 borrow-book" data-isbn="${book.isbn}">
                                Borrow
                            </button>`
                            : book.is_borrowed === true
                            ? `<button class="btn btn-sm btn-secondary ms-1" disabled>
                                    Borrowed
                                </button>`
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;

    return col;
  },

  // Create pagination
  createPagination: function (currentPage, totalPages, onPageChange) {
    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Page navigation");

    const ul = document.createElement("ul");
    ul.className = "pagination justify-content-center";

    // Previous button
    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;

    const prevLink = document.createElement("a");
    prevLink.className = "page-link";
    prevLink.href = "#";
    prevLink.setAttribute("aria-label", "Previous");
    prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';

    if (currentPage > 1) {
      prevLink.addEventListener("click", function (e) {
        e.preventDefault();
        onPageChange(currentPage - 1);
      });
    }

    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;

      const link = document.createElement("a");
      link.className = "page-link";
      link.href = "#";
      link.textContent = i;

      if (i !== currentPage) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          onPageChange(i);
        });
      }

      li.appendChild(link);
      ul.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${
      currentPage === totalPages ? "disabled" : ""
    }`;

    const nextLink = document.createElement("a");
    nextLink.className = "page-link";
    nextLink.href = "#";
    nextLink.setAttribute("aria-label", "Next");
    nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';

    if (currentPage < totalPages) {
      nextLink.addEventListener("click", function (e) {
        e.preventDefault();
        onPageChange(currentPage + 1);
      });
    }

    nextLi.appendChild(nextLink);
    ul.appendChild(nextLi);

    nav.appendChild(ul);
    return nav;
  },

  // Initialize tabs
  initTabs: function () {
    // Get all tab links
    const tabLinks = document.querySelectorAll(
      '.nav-link[data-bs-toggle="tab"]'
    );

    // Add event listener to each tab
    tabLinks.forEach((tabLink) => {
      tabLink.addEventListener("click", function (e) {
        e.preventDefault();

        // Remove active class from all tabs
        tabLinks.forEach((link) => {
          link.classList.remove("active");
          const tabContent = document.querySelector(link.getAttribute("href"));
          if (tabContent) {
            tabContent.classList.remove("show", "active");
          }
        });

        // Add active class to clicked tab
        this.classList.add("active");
        const targetTab = document.querySelector(this.getAttribute("href"));
        if (targetTab) {
          targetTab.classList.add("show", "active");
        }

        // Save active tab to localStorage
        localStorage.setItem("activeTab", this.getAttribute("href"));
      });
    });

    // Check if there's a saved active tab
    const activeTab = localStorage.getItem("activeTab");
    if (activeTab) {
      const tabLink = document.querySelector(`.nav-link[href="${activeTab}"]`);
      if (tabLink) {
        tabLink.click();
      }
    }
  },

  // Logout function
  logout: function () {
    localStorage.removeItem("access_token");
    window.location.href = "/logout";
  },
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  // Initialize Bootstrap tabs
  const authTabs = document.getElementById("authTabs");
  if (authTabs) {
    const tabButtons = authTabs.querySelectorAll(".nav-link");
    tabButtons.forEach((button) => {
      button.addEventListener("click", function (e) {
        e.preventDefault();

        // Remove active class from all tabs
        tabButtons.forEach((btn) => {
          btn.classList.remove("active");
          btn.setAttribute("aria-selected", "false");
        });

        // Add active class to clicked tab
        this.classList.add("active");
        this.setAttribute("aria-selected", "true");

        // Hide all tab panes
        const tabPanes = document.querySelectorAll(".tab-pane");
        tabPanes.forEach((pane) => {
          pane.classList.remove("show", "active");
        });

        // Show the target tab pane
        const targetId = this.getAttribute("data-bs-target");
        const targetPane = document.querySelector(targetId);
        if (targetPane) {
          targetPane.classList.add("show", "active");
        }
      });
    });
  }

  // Setup logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      utils.logout();
    });
  }

  // Handle register form submission
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Create form data object
      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          // Show success message
          utils.showNotification(
            "Registration successful! You can now log in.",
            "success"
          );

          // Reset form
          registerForm.reset();

          // Switch to login tab
          const loginTab = document.querySelector('a[href="#login-tab"]');
          if (loginTab) {
            loginTab.click();
          }
        } else {
          // Show error message
          utils.showNotification(
            result.error || "Registration failed. Please try again.",
            "error"
          );
        }
      } catch (error) {
        console.error("Registration error:", error);
        utils.showNotification(
          "An error occurred during registration. Please try again.",
          "error"
        );
      }
    });
  }

  // Setup login form if present
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          // Save token and user info
          utils.saveToken(data.access_token, data.user);

          // Show success message
          utils.showNotification("Login successful!", "success");

          // Redirect to appropriate dashboard
          utils.redirectToDashboard(data.user.role);
        } else {
          utils.showNotification(data.error || "Login failed", "danger");
        }
      } catch (error) {
        utils.handleApiError(error);
      }
    });
  }

  // Toggle between login and register forms
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");

  if (loginTab && registerTab) {
    loginTab.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("loginForm").classList.remove("d-none");
      document.getElementById("registerForm").classList.add("d-none");
      loginTab.classList.add("active");
      registerTab.classList.remove("active");
    });

    registerTab.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("loginForm").classList.add("d-none");
      document.getElementById("registerForm").classList.remove("d-none");
      registerTab.classList.add("active");
      loginTab.classList.remove("active");
    });
  }
});
