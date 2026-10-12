import api from './api';

const USER_KEY = 'contract_review_user';

let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
} catch {
    currentUser = null;
}

const saveUser = (user) => {
    currentUser = user;
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
export const getCurrentUser = () => currentUser;

/** 当前用户 ID */
export const getUserId = () => (currentUser ? currentUser.userId : null);

/** 当前用户角色 */
export const getRole = () => (currentUser ? currentUser.role : null);

/** 是否已登录 */
export const isLoggedIn = () => !!currentUser;

/** 是否管理员 */
export const isAdmin = () => !!currentUser && currentUser.role === 'admin';

/** 兼容旧调用：若已登录直接返回，否则返回 null（由路由守卫跳转登录页） */
export const identifyUser = async () => {
    return getUserId();
};
