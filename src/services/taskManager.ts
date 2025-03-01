import config from '../config';
import { BaseTask } from '../types';

/**
 * タスク管理サービス
 * 
 * 処理中のタスク（ダウンロード、変換、トリミング、スクリーンショット）の状態を管理します。
 * 現在はインメモリで管理していますが、必要に応じてRedisやデータベースに切り替えることも可能です。
 */

// タスクを保存するメモリマップ
const tasks = new Map<string, BaseTask>();

// 古いタスクのクリーンアップ間隔（ミリ秒）
const CLEANUP_INTERVAL = 3600000; // 1時間

// タスクの有効期限（ミリ秒）
const TASK_EXPIRY = config.FILE_RETENTION_HOURS * 3600000;

/**
 * タスクを設定/追加する
 * @param {string} key - タスクの一意の識別子
 * @param {BaseTask} data - タスクのデータ
 */
export const setTask = <T extends BaseTask>(key: string, data: T): void => {
  tasks.set(key, data);
};

/**
 * タスクを取得する
 * @param {string} key - タスクの一意の識別子
 * @returns {T|null} - タスクのデータまたはnull
 */
export const getTask = <T extends BaseTask>(key: string): T | null => {
  const task = tasks.get(key);
  return task ? task as T : null;
};

/**
 * タスクを更新する
 * @param {string} key - タスクの一意の識別子
 * @param {Partial<T>} data - 更新するデータ（部分更新可能）
 * @returns {boolean} - 更新が成功したかどうか
 */
export const updateTask = <T extends BaseTask>(key: string, data: Partial<T>): boolean => {
  const task = tasks.get(key);
  if (!task) return false;
  
  // タスクを更新
  tasks.set(key, { ...task, ...data });
  return true;
};

/**
 * タスクを削除する
 * @param {string} key - タスクの一意の識別子
 * @returns {boolean} - 削除が成功したかどうか
 */
export const deleteTask = (key: string): boolean => {
  return tasks.delete(key);
};

/**
 * 指定されたプレフィックスを持つすべてのタスクを取得する
 * @param {string} prefix - タスクキーのプレフィックス
 * @returns {T[]} - タスクの配列
 */
export const getTasksByPrefix = <T extends BaseTask>(prefix: string): T[] => {
  const result: T[] = [];
  for (const [key, value] of tasks.entries()) {
    if (key.startsWith(prefix)) {
      result.push(value as T);
    }
  }
  return result;
};

/**
 * 古いタスクをクリーンアップする
 */
const cleanupTasks = (): void => {
  const now = Date.now();
  for (const [key, task] of tasks.entries()) {
    // タスクが作成されてから一定時間経過しているかチェック
    if (task.created && (now - new Date(task.created).getTime() > TASK_EXPIRY)) {
      tasks.delete(key);
    }
  }
};

// 定期的なクリーンアップを開始
setInterval(cleanupTasks, CLEANUP_INTERVAL);