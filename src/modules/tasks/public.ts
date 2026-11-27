/**
 * Public interface of the Tasks module (MODULE-BOUNDARIES section 2). Nothing consumes
 * `TodoCompleted` in M10; Gamification registers a subscriber in Phase 2 (FR-172).
 */
export {
  createTodo,
  decodeCursor,
  deleteTodo,
  editTodo,
  encodeCursor,
  exportTodos,
  getTodo,
  listTodos,
  priorityRank,
  purgeTodos,
  setTodoCompletion,
  sortKey,
  type CreateTodoInput,
  type Todo,
  type TodoContext,
  type TodoDueState,
  type TodoListQuery,
  type TodoPage,
  type TodoPriority,
  type UpdateTodoInput,
} from "./service";
export {
  publishTodoEvent,
  todoEventSubscribers,
  type TodoEvent,
  type TodoEventSubscriber,
} from "./events";
