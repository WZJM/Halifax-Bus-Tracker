# 🚌 Halifax Bus Tracker (HRM)

A lightweight, real-time bus tracking web application for Halifax Transit. Built to provide a faster, mobile-optimized alternative for daily commuters to check bus locations and route statuses.

🔗 **Live Demo:** [https://wzjm.github.io/Halifax-Bus-Tracker/](https://wzjm.github.io/Halifax-Bus-Tracker/)

![Project Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📖 Overview

This project visualizes real-time GTFS (General Transit Feed Specification) data from Halifax Transit on an interactive map. Unlike standard map apps, this tracker focuses on:
* **Raw Real-Time Accuracy:** Updates every 15 seconds directly from the transit authority.
* **Stale Data Detection:** Alerting users if the official feed goes down or gets stuck.
* **Route Filtering:** Ability to watch specific routes while hiding others.
* **Mobile Performance:** Optimized touch targets and rendering for phones.

## ✨ Key Features

* **Real-Time Tracking:** Buses move and update location, bearing, and speed every 15 seconds.
* **Smart Search & Filter:** * Search for routes by number (e.g., "90") or name.
    * Filters the map to show *only* the selected buses.
    * Includes a static "Master List" so routes appear in the search even if no buses are currently running (e.g., weekends).
* **Localization (i18n):** Fully translated interface in **English**, **French**, and **Chinese (Simplified)**.
* **Stale Data Indicators:** * The backend monitors the data feed integrity.
    * A "Warning" icon appears automatically if the data hasn't changed in >60 seconds.
* **User Geolocation:** "Locate Me" button to see buses near your physical location.


## 📂 Project Structure

```text
/
├── index.html      # Main structure and map container
├── style.css       # Responsive styling, animations, and map overrides
├── script.js       # Core logic: Map rendering, API fetching, Localization
└── README.md       # Project documentation
```


## ℹ️🅱️ IB CAS Project
This website servers as a part of my **IB CAS** (Creativity, Activity, and Service) portfolio.
* **Creativity**: Designing the user interface, architecting the Progressive Web App (PWA) logic, and writing the front-end and back-end code to solve real-time data challenges.
* **Service**: Developing and maintaining a free, highly accessible, and ad-free transit tool to help commuters in the local Halifax community navigate the city more efficiently.


## 📄 Credits & Data

* **Data Source:** [Halifax Open Data (GTFS API)](https://www.halifax.ca/home/open-data)
* **Map Tiles:** &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) Contributors.

---
*Created by [WZJM(Joshua Wu)](https://github.com/WZJM).*