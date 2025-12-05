// Firebase SDK import 및 초기화
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZztd5Tt-LYaUfwZxBzSLFpHBfCyTMlR0",
  authDomain: "wonban-todo-backend.firebaseapp.com",
  projectId: "wonban-todo-backend",
  storageBucket: "wonban-todo-backend.firebasestorage.app",
  messagingSenderId: "461231393958",
  appId: "1:461231393958:web:2d1de6aabba7e1e4f27867",
  databaseURL: "https://wonban-todo-backend-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// -----------------------------
// 달력 + 할 일 앱 로직
// -----------------------------

let todos = []; // {id, text, completed, date(YYYY-MM-DD), createdAt}

const todayEl = document.getElementById("today");
const inputEl = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const formEl = document.getElementById("todo-form");
const calendarGridEl = document.getElementById("calendar-grid");
const yearSelectEl = document.getElementById("year-select");
const monthSelectEl = document.getElementById("month-select");
const selectedDateTextEl = document.getElementById("selected-date-text");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");

let currentYear;
let currentMonth; // 0-11
let selectedDateStr; // YYYY-MM-DD

function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderHeaderDate() {
  const now = new Date();
  const options = { year: "numeric", month: "long", day: "numeric", weekday: "short" };
  todayEl.textContent = now.toLocaleDateString("ko-KR", options);
}

function updateSelectedDateText() {
  if (!selectedDateStr) {
    selectedDateTextEl.textContent = "";
    return;
  }
  const [y, m, d] = selectedDateStr.split("-");
  selectedDateTextEl.textContent = `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일에 할 일 추가`;
}

function renderCalendar() {
  calendarGridEl.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const firstWeekday = firstDay.getDay(); // 0(일)~6(토)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // 앞쪽 빈 칸
  for (let i = 0; i < firstWeekday; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell outside";
    calendarGridEl.appendChild(emptyCell);
  }

  const todayStr = formatDateYMD(new Date());

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = formatDateYMD(date);

    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (dateStr === todayStr) {
      cell.classList.add("today");
    }
    if (dateStr === selectedDateStr) {
      cell.classList.add("selected");
    }
    cell.dataset.date = dateStr;

    const numberEl = document.createElement("div");
    numberEl.className = "day-number";
    numberEl.textContent = day;
    cell.appendChild(numberEl);

    const todosContainer = document.createElement("div");
    todosContainer.className = "day-todos";

    const dayTodos = todos.filter((t) => t.date === dateStr);
    dayTodos.forEach((todo) => {
      const itemEl = document.createElement("div");
      itemEl.className = "day-todo-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.completed;
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        toggleTodo(todo.id);
      });

      const textEl = document.createElement("span");
      textEl.className = "day-todo-text" + (todo.completed ? " completed" : "");
      textEl.textContent = todo.text;

      const actionsEl = document.createElement("div");
      actionsEl.className = "day-todo-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "day-todo-btn edit";
      editBtn.textContent = "수정";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        editTodo(todo.id);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "day-todo-btn delete";
      deleteBtn.textContent = "삭제";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTodo(todo.id);
      });

      actionsEl.appendChild(editBtn);
      actionsEl.appendChild(deleteBtn);

      itemEl.appendChild(checkbox);
      itemEl.appendChild(textEl);
      itemEl.appendChild(actionsEl);

      todosContainer.appendChild(itemEl);
    });

    cell.appendChild(todosContainer);

    cell.addEventListener("click", () => {
      selectedDateStr = dateStr;
      updateSelectedDateText();
      renderCalendar();
    });

    calendarGridEl.appendChild(cell);
  }

  yearSelectEl.value = String(currentYear);
  monthSelectEl.value = String(currentMonth + 1);
}

async function addTodo() {
  const text = inputEl.value.trim();
  if (!text) return;

  const now = new Date();
  const baseDate = selectedDateStr ? new Date(selectedDateStr) : now;
  const dateStr = formatDateYMD(baseDate);

  // Firebase Realtime Database에 먼저 저장
  const newTodoData = {
    text,
    completed: false,
    createdAt: Date.now(),
    date: dateStr,
  };

  try {
    const todosRef = ref(db, "todos");
    const newRef = push(todosRef);
    await set(newRef, newTodoData);

    // 로컬 상태 업데이트는 Firebase의 onValue 콜백에서 처리되므로 여기서는 제거
    // inputEl만 초기화 (renderCalendar는 onValue 콜백에서 자동으로 호출됨)
    inputEl.value = "";
  } catch (error) {
    console.error("Firebase에 할 일을 추가하는 중 오류:", error);
    alert("할 일을 저장하는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  }
}

async function toggleTodo(id) {
  const target = todos.find((t) => t.id === id);
  if (!target) return;

  const newCompleted = !target.completed;

  try {
    const todoRef = ref(db, `todos/${id}`);
    await update(todoRef, { completed: newCompleted });

    // 로컬 상태 업데이트는 Firebase의 onValue 콜백에서 처리됨
  } catch (error) {
    console.error("Firebase에서 완료 상태를 변경하는 중 오류:", error);
    alert("완료 상태를 변경하는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  }
}

async function editTodo(id) {
  const target = todos.find((t) => t.id === id);
  if (!target) return;

  const newText = prompt("할 일을 수정하세요:", target.text);
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed) return;

  try {
    // Firebase 상의 해당 todo 업데이트
    const todoRef = ref(db, `todos/${id}`);
    await update(todoRef, { text: trimmed });

    // 로컬 상태 업데이트는 Firebase의 onValue 콜백에서 처리됨
  } catch (error) {
    console.error("Firebase에서 할 일을 수정하는 중 오류:", error);
    alert("할 일을 수정하는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  }
}

async function deleteTodo(id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;

  try {
    // Firebase에서 삭제
    const todoRef = ref(db, `todos/${id}`);
    await remove(todoRef);

    // 로컬 상태 업데이트는 Firebase의 onValue 콜백에서 처리됨
  } catch (error) {
    console.error("Firebase에서 할 일을 삭제하는 중 오류:", error);
    alert("할 일을 삭제하는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  }
}

// Firebase에서 todos 실시간 구독 (초기 로딩 + 이후 변경 반영)
function subscribeTodos() {
  const todosRef = ref(db, "todos");

  onValue(
    todosRef,
    (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        todos = [];
      } else {
        todos = Object.entries(data)
          .map(([id, value]) => {
            const createdAt = value.createdAt ?? 0;
            let dateStr = value.date;
            if (!dateStr && createdAt) {
              dateStr = formatDateYMD(new Date(createdAt));
            }
            return {
              id,
              text: value.text ?? "",
              completed: !!value.completed,
              createdAt,
              date: dateStr,
            };
          })
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      }

      renderCalendar();
    },
    (error) => {
      console.error("Firebase에서 할 일 목록을 불러오는 중 오류:", error);
    }
  );
}

// 폼 submit 이벤트 하나만 사용해서 중복 추가 방지
formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo();
});

// 연/월 선택 및 네비게이션
yearSelectEl.addEventListener("change", () => {
  currentYear = parseInt(yearSelectEl.value, 10);
  renderCalendar();
});

monthSelectEl.addEventListener("change", () => {
  currentMonth = parseInt(monthSelectEl.value, 10) - 1;
  renderCalendar();
});

prevMonthBtn.addEventListener("click", () => {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar();
});

// 초기 설정
const today = new Date();
currentYear = today.getFullYear();
currentMonth = today.getMonth();
selectedDateStr = formatDateYMD(today);

// 연/월 선택 박스 옵션 채우기 (연도는 근처 5년 범위)
for (let y = currentYear - 2; y <= currentYear + 3; y++) {
  const opt = document.createElement("option");
  opt.value = String(y);
  opt.textContent = `${y}년`;
  yearSelectEl.appendChild(opt);
}

for (let m = 1; m <= 12; m++) {
  const opt = document.createElement("option");
  opt.value = String(m);
  opt.textContent = `${m}월`;
  monthSelectEl.appendChild(opt);
}

updateSelectedDateText();
renderHeaderDate();
subscribeTodos();


