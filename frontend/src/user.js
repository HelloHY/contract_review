import { ref } from 'vue';
import api from './api';

const USER_KEY = 'contract_review_user';

const loadStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
        return null;
    }
};

// 使用 ref 保持响应式，登录/登出后依赖它的 computed 与模板才会更新
const currentUser = ref(loadStoredUser());

const saveUser = (user) => {
    currentUser.value = user || null;
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(USER_KEY);
    }
};

/** 用户名密码登录 */
export const login = async (username, password) => {
    const response = await api.login({ username, password });
    const user = {
        userId: response.data.userId,
        username: response.data.username,
        displayName: response.data.displayName,
        role: response.data.role || 'user',
    };
    saveUser(user);
    return user;
};

/** 登出 */
export const logout = () => {
    saveUser(null);
};

/** 当前登录用户，未登录返回 null */
export const getCurrentUser = () => currentUser.value;

/** 当前用户 ID */
export const getUserId = () => (currentUser.value ? currentUser.value.userId : null);

/** 当前用户角色 */
export const getRole = () => (currentUser.value ? currentUser.value.role : null);

/** 是否已登录 */
export const isLoggedIn = () => !!currentUser.value;

/** 是否管理员 */
export const isAdmin = () => !!currentUser.value && currentUser.value.role === 'admin';

/** 兼容旧调用：若已登录直接返回，否则返回 null（由路由守卫跳转登录页） */
export const identifyUser = async () => {
    return getUserId();
};
