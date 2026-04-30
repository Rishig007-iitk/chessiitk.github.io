// Get references to the menu button and the navbar
const menuButton = document.getElementById("menu-toggle");
const navbar = document.querySelector(".navbar");

// Add a click event listener to the menu button
menuButton.addEventListener("click", () => {
  // Toggle the "active" class on the navbar to show/hide it
  navbar.classList.toggle("active");
});

// Scroll Reveal Animation
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    section.classList.add('reveal-on-scroll');
    observer.observe(section);
});
