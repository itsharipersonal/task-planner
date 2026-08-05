export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
};

export type UpdateTaskInput = {
  title?: string;
  completed?: boolean;
};

export function rowToTask(row: {
  id: string;
  title: string;
  completed: number;
  created_at: string;
  updated_at: string;
}): Task {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
