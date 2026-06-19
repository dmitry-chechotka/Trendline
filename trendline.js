import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDWsdDfrUrd4g-F4AOqpt6HKlFK4HJY65o",
  authDomain: "trendline-mvp.firebaseapp.com",
  projectId: "trendline-mvp",
  storageBucket: "trendline-mvp.firebasestorage.app",
  messagingSenderId: "145984945026",
  appId: "1:145984945026:web:63fda3187d1c3c34352d9b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Load weight data from JSON
let weightData = [];

async function loadWeightData() {
  try {
    const response = await fetch("weight_data_json.json");
    if (!response.ok) {
      throw new Error("JSON file not found");
    }
    const jsonData = await response.json();
    weightData = jsonData.entries || [];
  } catch (error) {
    console.error("Could not load weight data:", error.message);
    weightData = [];
  }

  // Sort data by date to ensure correct order
  weightData.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Initialize the app after data is loaded
  updateAnalysis();
}

const TARGET_WEIGHT = 74.3; // 67.5 + 6.8kg (15lbs)
const IDEAL_WEEKLY_RATE = 0.375; // 0.25-0.5 kg/week average

let chart;

function calculateMovingAverage(data, window) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const subset = data.slice(start, end);
    const avg =
      subset.reduce((sum, item) => sum + item.weight, 0) / subset.length;
    result.push({ ...data[i], smoothed: avg });
  }
  return result;
}

function filterDataByPeriod(data, period) {
  if (period === "all") return data;

  const now = new Date();
  const cutoffDate = new Date(now);

  switch (period) {
    case "1w":
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case "2w":
      cutoffDate.setDate(now.getDate() - 14);
      break;
    case "4w":
      cutoffDate.setDate(now.getDate() - 28);
      break;
  }

  return data.filter((item) => new Date(item.date) >= cutoffDate);
}

function calculateWeeklyRate(data, weeks = 2) {
  if (data.length < 2) return 0;

  const recent = data.slice(-Math.min(weeks * 3, data.length)); // Approximate days
  if (recent.length < 2) return 0;

  const firstWeight = recent[0].weight;
  const lastWeight = recent[recent.length - 1].weight;
  const daysDiff =
    (new Date(recent[recent.length - 1].date) -
      new Date(recent[0].date)) /
    (1000 * 60 * 60 * 24);

  return ((lastWeight - firstWeight) / daysDiff) * 7;
}

let removeOutliers = false;

function toggleOutlierRemoval() {
  removeOutliers = !removeOutliers;
  document.getElementById("outlierBtn").textContent = removeOutliers
    ? "Disable Outlier Removal"
    : "Enable Outlier Removal";
  updateAnalysis();
}

function median(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function medianFilter(data, window) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const subset = data.slice(start, end).map((item) => item.weight);
    result.push({ ...data[i], smoothed: median(subset) });
  }
  return result;
}

function detectOutliers(data) {
  // Tukey's method: outside 1.5*IQR
  const weights = data.map((d) => d.weight);
  const q1 = median(weights.slice(0, Math.floor(weights.length / 2)));
  const q3 = median(weights.slice(Math.ceil(weights.length / 2)));
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return data.map((d) => d.weight < lower || d.weight > upper);
}

function removeOutlierData(data) {
  const outlierFlags = detectOutliers(data);
  return data.filter((d, i) => !outlierFlags[i]);
}

function calculateStandardDeviation(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(
    arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length
  );
}

function calculateStats(data) {
  const weights = data.map((d) => d.weight);
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
  const med = median(weights);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const std = calculateStandardDeviation(weights);
  const range = max - min;
  const q1 = median(weights.slice(0, Math.floor(weights.length / 2)));
  const q3 = median(weights.slice(Math.ceil(weights.length / 2)));
  const iqr = q3 - q1;
  return { mean, med, min, max, std, range, q1, q3, iqr };
}

function showStatsModal() {
  const data = getProcessedData();
  const stats = calculateStats(data);
  document.getElementById("advancedStats").innerHTML = `
          <ul style="list-style:none; padding:0;">
            <li><b>Mean:</b> ${stats.mean.toFixed(2)} kg</li>
            <li><b>Median:</b> ${stats.med.toFixed(2)} kg</li>
            <li><b>Min:</b> ${stats.min.toFixed(2)} kg</li>
            <li><b>Max:</b> ${stats.max.toFixed(2)} kg</li>
            <li><b>Standard Deviation:</b> ${stats.std.toFixed(2)} kg</li>
            <li><b>Range:</b> ${stats.range.toFixed(2)} kg</li>
            <li><b>Q1 (25th percentile):</b> ${stats.q1.toFixed(2)} kg</li>
            <li><b>Q3 (75th percentile):</b> ${stats.q3.toFixed(2)} kg</li>
            <li><b>IQR:</b> ${stats.iqr.toFixed(2)} kg</li>
            <li><b>Outliers:</b> ${
              detectOutliers(data).filter(Boolean).length
            }</li>
          </ul>
        `;
  document.getElementById("statsModal").style.display = "flex";
}
function hideStatsModal() {
  document.getElementById("statsModal").style.display = "none";
}

function toggleUserDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById("userDropdown");
  dropdown.classList.toggle("hidden");
}

function handleProfileClick() {
  closeUserDropdown();
  window.location.href = 'profile.html';
}

function handleSettingsClick() {
  closeUserDropdown();
  window.location.href = 'settings.html';
}

function handleLogoutClick() {
  console.log("Log out clicked");
  closeUserDropdown();
  showLogoutModal();
}

function showLogoutModal() {
  const overlay = document.getElementById('logoutOverlay');
  const modal = document.getElementById('logoutModal');
  if (overlay) overlay.classList.remove('hidden');
  if (modal) modal.classList.remove('hidden');
}

function hideLogoutModal() {
  const overlay = document.getElementById('logoutOverlay');
  const modal = document.getElementById('logoutModal');
  if (overlay) overlay.classList.add('hidden');
  if (modal) modal.classList.add('hidden');
}

function confirmLogout() {
  hideLogoutModal();
  signOut(auth)
    .then(() => {
      console.log("User signed out successfully");
      window.location.href = 'index.html';
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}

function cancelLogout() {
  hideLogoutModal();
}

function closeUserDropdown() {
  const dropdown = document.getElementById("userDropdown");
  if (dropdown && !dropdown.classList.contains("hidden")) {
    dropdown.classList.add("hidden");
  }
}

window.addEventListener("click", function (event) {
  const dropdown = document.getElementById("userDropdown");
  if (!dropdown) return;
  const button = document.querySelector(".user-button");
  if (button && !button.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.add("hidden");
  }
});

function getProcessedData() {
  let data = weightData;
  if (removeOutliers) {
    data = removeOutlierData(data);
  }
  return data;
}

function calculateMovingAverageOrMedian(data, window, method) {
  if (method === "median") return medianFilter(data, 7);
  return calculateMovingAverage(data, window);
}

function updateStats() {
  const data = getProcessedData();
  const currentData = data[data.length - 1];
  const firstData = data[0];

  // Current weight
  document.getElementById("currentWeight").textContent =
    currentData.weight.toFixed(1) + " kg";
  const weightChange = currentData.weight - firstData.weight;
  document.getElementById("weightChange").textContent =
    (weightChange >= 0 ? "+" : "") +
    weightChange.toFixed(1) +
    " kg total";

  // Weekly rate
  const weeklyRate = calculateWeeklyRate(data);
  document.getElementById("weeklyRate").textContent =
    (weeklyRate >= 0 ? "+" : "") + weeklyRate.toFixed(2) + " kg/week";

  // Total gain
  document.getElementById("totalGain").textContent =
    (weightChange >= 0 ? "+" : "") + weightChange.toFixed(1) + " kg";
  const daysDiff =
    (new Date(currentData.date) - new Date(firstData.date)) /
    (1000 * 60 * 60 * 24);
  document.getElementById("daysTracking").textContent =
    Math.round(daysDiff) + " days tracked";

  // Projected time to target
  if (weeklyRate > 0) {
    const remainingWeight = TARGET_WEIGHT - currentData.weight;
    const weeksToTarget = remainingWeight / weeklyRate;
    document.getElementById("projectedTime").textContent =
      weeksToTarget > 0
        ? Math.round(weeksToTarget) + " weeks"
        : "Target reached!";
  } else {
    document.getElementById("projectedTime").textContent = "No progress";
  }
}

function generateInsights() {
  const data = getProcessedData();
  const weeklyRate = calculateWeeklyRate(data);
  const currentWeight = data[data.length - 1].weight;
  const totalGain = currentWeight - data[0].weight;
  const stats = calculateStats(data);
  const outlierCount = detectOutliers(weightData).filter(Boolean).length;
  const insights = [];

  // Rate analysis
  if (weeklyRate >= 0.25 && weeklyRate <= 0.5) {
    insights.push({
      type: "positive",
      text: `Perfect pace! Your 2-week rate of ${weeklyRate.toFixed(
        2
      )}kg/week is in the ideal gain range (0.25-0.5kg/week).`,
    });
  } else if (weeklyRate < 0.25 && weeklyRate > 0) {
    insights.push({
      type: "warning",
      text: `Gaining slowly at ${weeklyRate.toFixed(
        2
      )}kg/week. Consider increasing calories slightly to hit your 0.25-0.5kg/week target.`,
    });
  } else if (weeklyRate > 0.5) {
    insights.push({
      type: "alert",
      text: `Fast gain at ${weeklyRate.toFixed(
        2
      )}kg/week. Consider reducing calories to stay in a steady growth range and minimize fat gain.`,
    });
  } else {
    insights.push({
      type: "alert",
      text: `No weight gain detected. A caloric surplus may be needed to support consistent progress.`,
    });
  }

  // Progress analysis
  if (totalGain > 0) {
    const avgWeeklyRate =
      totalGain /
      ((new Date(data[data.length - 1].date) - new Date(data[0].date)) /
        (1000 * 60 * 60 * 24) /
        7);
    insights.push({
      type: "positive",
      text: `Overall progress: +${totalGain.toFixed(
        1
      )}kg gained with an average rate of ${avgWeeklyRate.toFixed(
        2
      )}kg/week since tracking began.`,
    });
  }

  // Target projection
  const remainingWeight = TARGET_WEIGHT - currentWeight;
  if (weeklyRate > 0) {
    const weeksToTarget = remainingWeight / weeklyRate;
    if (weeksToTarget <= 26) {
      insights.push({
        type: "positive",
        text: `On track to reach your 15lb target (74.3kg) in approximately ${Math.round(
          weeksToTarget
        )} weeks at current rate.`,
      });
    } else {
      insights.push({
        type: "warning",
        text: `At current rate, you'll need ${Math.round(
          weeksToTarget
        )} weeks to reach target. Consider slight calorie increase to meet 6-9 month goal.`,
      });
    }
  }

  // Outlier insight
  if (outlierCount > 0) {
    insights.push({
      type: "alert",
      text: `Detected ${outlierCount} outlier${
        outlierCount > 1 ? "s" : ""
      } in your data. Consider enabling outlier removal for more robust analysis.`,
    });
  }

  // Advanced stats insight
  insights.push({
    type: "positive",
    text: `Standard deviation: ${stats.std.toFixed(
      2
    )}kg, Median: ${stats.med.toFixed(2)}kg, IQR: ${stats.iqr.toFixed(
      2
    )}kg.`,
  });

  return insights;
}

function updateInsights() {
  const insights = generateInsights();
  const insightsList = document.getElementById("insightsList");
  insightsList.innerHTML = insights
    .map(
      (insight) =>
        `<div class="insight-item ${insight.type}">${insight.text}</div>`
    )
    .join("");
}

function updateDataTable() {
  const data = getProcessedData();
  let smoothedData;
  const smoothingMethod = document.getElementById("smoothing").value;
  if (smoothingMethod === "median") {
    smoothedData = medianFilter(data, 7);
  } else {
    smoothedData = calculateMovingAverage(data, parseInt(smoothingMethod));
  }
  const tbody = document.getElementById("dataTableBody");
  tbody.innerHTML = smoothedData
    .map((item, index) => {
      const change =
        index > 0 ? item.weight - smoothedData[index - 1].weight : 0;
      const weeklyRate =
        index >= 6
          ? calculateWeeklyRate(
              smoothedData.slice(Math.max(0, index - 6), index + 1)
            )
          : 0;

      return `
                    <tr>
                        <td>${new Date(item.date).toLocaleDateString()}</td>
                        <td>${item.weight.toFixed(1)}</td>
                        <td style="color: ${
                          change >= 0 ? "#10b981" : "#ef4444"
                        }">${change >= 0 ? "+" : ""}${change.toFixed(1)}</td>
                        <td>${item.smoothed.toFixed(1)}</td>
                        <td>${weeklyRate.toFixed(2)}</td>
                    </tr>
                `;
    })
    .join("");
}

function updateChart() {
  const timePeriod = document.getElementById("timePeriod").value;
  const smoothingMethod = document.getElementById("smoothing").value;
  let smoothingWindow = 7;
  if (smoothingMethod !== "median") {
    smoothingWindow = parseInt(smoothingMethod);
  }
  let data = getProcessedData();
  data = filterDataByPeriod(data, timePeriod);
  let smoothedData;
  if (smoothingMethod === "median") {
    smoothedData = medianFilter(data, 7);
  } else {
    smoothedData = calculateMovingAverage(data, smoothingWindow);
  }
  const ctx = document.getElementById("weightChart").getContext("2d");

  // Generate trend line
  const trendLine = [];
  if (smoothedData.length >= 2) {
    const firstPoint = smoothedData[0];
    const lastPoint = smoothedData[smoothedData.length - 1];
    const startDate = new Date(firstPoint.date).getTime();
    const endDate = new Date(lastPoint.date).getTime();
    const slope =
      (lastPoint.smoothed - firstPoint.smoothed) /
      ((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Extend trend line into future
    const futureDate = new Date(endDate);
    futureDate.setDate(futureDate.getDate() + 60); // 2 months ahead

    trendLine.push(
      { x: firstPoint.date, y: firstPoint.smoothed },
      { x: lastPoint.date, y: lastPoint.smoothed },
      {
        x: futureDate.toISOString().split("T")[0],
        y: lastPoint.smoothed + slope * 60,
      }
    );
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Actual Weight",
          data: data.map((item) => ({
            x: item.date,
            y: item.weight,
          })),
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          pointBackgroundColor: "#667eea",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
          fill: false,
          tension: 0,
        },
        {
          label: `${
            smoothingMethod === "median"
              ? "Median Filter"
              : smoothingWindow + "-Day Average"
          }`,
          data: smoothedData.map((item) => ({
            x: item.date,
            y: item.smoothed,
          })),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          pointBackgroundColor: "#10b981",
          pointRadius: 4,
          borderWidth: 3,
          fill: false,
          tension: 0.2,
        },
        {
          label: "Trend Projection",
          data: trendLine,
          borderColor: "#f59e0b",
          backgroundColor: "transparent",
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Target Weight (74.3kg)",
          data: [
            { x: data[0]?.date, y: TARGET_WEIGHT },
            {
              x: data[data.length - 1]?.date,
              y: TARGET_WEIGHT,
            },
          ],
          borderColor: "#ef4444",
          backgroundColor: "transparent",
          borderDash: [10, 5],
          pointRadius: 0,
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#333",
          bodyColor: "#666",
          borderColor: "#ddd",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label +
                ": " +
                context.parsed.y.toFixed(1) +
                " kg"
              );
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            parser: "yyyy-MM-dd",
            displayFormats: {
              day: "MMM dd",
              week: "MMM dd",
            },
            tooltipFormat: "MMM dd, yyyy",
          },
          grid: {
            color: "rgba(0,0,0,0.1)",
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: false,
          min: Math.min(...data.map((d) => d.weight)) - 0.5,
          max: Math.max(
            Math.max(...data.map((d) => d.weight)) + 0.5,
            TARGET_WEIGHT + 0.5
          ),
          grid: {
            color: "rgba(0,0,0,0.1)",
          },
          ticks: {
            callback: function (value) {
              return value.toFixed(1) + " kg";
            },
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });

  console.log("Chart updated with", data.length, "data points");
}

function updateAnalysis() {
  const data = getProcessedData();
  if (!data || data.length === 0) {
    document.getElementById("currentWeight").textContent = "--";
    document.getElementById("weightChange").textContent = "--";
    document.getElementById("weeklyRate").textContent = "--";
    document.getElementById("totalGain").textContent = "--";
    document.getElementById("daysTracking").textContent = "--";
    document.getElementById("projectedTime").textContent = "--";
    document.getElementById("insightsList").innerHTML = "";
    document.getElementById("dataTableBody").innerHTML = "";
    return;
  }

  updateStats();
  updateChart();
  updateInsights();
  updateDataTable();
}

// Initialize only on the main dashboard (home) to avoid running dashboard code on header-only pages
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("mainDashboard")) {
    loadWeightData();
  }
});

// Export functions to global scope for HTML onclick handlers
window.toggleUserDropdown = toggleUserDropdown;
window.handleProfileClick = handleProfileClick;
window.handleSettingsClick = handleSettingsClick;
window.handleLogoutClick = handleLogoutClick;
window.showLogoutModal = showLogoutModal;
window.hideLogoutModal = hideLogoutModal;
window.confirmLogout = confirmLogout;
window.cancelLogout = cancelLogout;
window.closeUserDropdown = closeUserDropdown;
window.hideStatsModal = hideStatsModal;
