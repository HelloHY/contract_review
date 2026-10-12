import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn, isAdmin, getUserId } from '../user'

const Home = () => import('../views/Home.vue')
const Review = () => import('../views/Review.vue')
const QnA = () => import('../views/QnA.vue')
const Settings = () => import('../views/Settings.vue')
const Library = () => import('../views/Library.vue')
const Login = () => import('../views/Login.vue')
const Users = () => import('../views/Users.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/review',
    name: 'Review',
    component: Review,
    meta: { requiresAuth: true },
  },
  {
    path: '/library',
    name: 'Library',
    component: Library,
    meta: { requiresAuth: true },
  },
  {
    path: '/qna',
    name: 'QnA',
    component: QnA,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true },
  },
  {
    path: '/history',
    redirect: '/library',
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const loggedIn = isLoggedIn()
  const admin = isAdmin()

  if (to.meta.requiresAuth && !loggedIn) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAdmin && !admin) {
    return next({ path: '/' })
  }

  if (to.meta.guest && loggedIn) {
    return next({ path: '/' })
  }

  next()
})

export default router
