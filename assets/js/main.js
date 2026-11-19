"use strict";
// Each experiment starts independently so a failure in one does not hide the others.
document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  try {
    const canvas = document.querySelector("#hero-network");
    if (canvas) initNetwork(canvas);
  } catch (error) {
    console.error("Background network failed:", error);
  }

  try {
    initPathfinding();
  } catch (error) {
    console.error("Pathfinding failed:", error);
    const status = document.querySelector("#path-status");
    if (status) status.textContent = "Could not initialize the grid. Please check the browser console.";
  }

  try {
    Promise.resolve(initRecognition()).catch(error => {
      console.error("Digit recognition failed:", error);
      const status = document.querySelector("#model-status");
      if (status) status.textContent = "Could not start digit recognition. Check the browser console.";
    });
  } catch (error) {
    console.error("Digit recognition failed:", error);
  }
});
