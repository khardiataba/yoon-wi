const iconByName = {
  star: "M12 2 6.5 9l1.8 8.5L12 16l3.7 1.5L17.5 9z",
  home: "M3 10.5 12 3l9 7.5v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z",
  tools: "m4 20 6-6m4-4 6-6M8.5 14.5 3 9l2.5-2.5L11 12m2 2 5.5 5.5L21 17l-5.5-5.5",
  car: "M5 14.5h14l-1.2-4.2a2 2 0 0 0-1.9-1.4H8.1a2 2 0 0 0-1.9 1.4L5 14.5Zm1 0v2.5m12-2.5v2.5M8 18.5a1.5 1.5 0 1 0 0 .01V18.5Zm8 0a1.5 1.5 0 1 0 0 .01V18.5Z",
  bell: "M12 4a4 4 0 0 0-4 4v2.4c0 .7-.2 1.4-.6 2L6 14.5h12l-1.4-2.1a3.8 3.8 0 0 1-.6-2V8a4 4 0 0 0-4-4Zm-2 12a2 2 0 1 0 4 0",
  chat: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  list: "M8 7h12M8 12h12M8 17h12M4.5 7h.01M4.5 12h.01M4.5 17h.01",
  user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  logout: "M15 17l5-5-5-5M20 12H9M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6",
  search: "m21 21-4.3-4.3m1.8-5a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z",
  pin: "M12 21s6-5.8 6-10a6 6 0 1 0-12 0c0 4.2 6 10 6 10Zm0-8a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  info: "M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  moto: "M4 14h4m8 0h4M8 14a3 3 0 1 0 0 .01V14Zm8 0a3 3 0 1 0 0 .01V14ZM9 14l2-4h4l2 4m-5-4V8",
  van: "M3 14h18v-4.2a2 2 0 0 0-2-2H7.5a3 3 0 0 0-2.4 1.2L3 11.7V14Zm2 0v2m14-2v2M7.5 18a1.5 1.5 0 1 0 0 .01V18Zm9 0a1.5 1.5 0 1 0 0 .01V18Z"
}

const AppIcon = ({ name, className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={iconByName[name] || iconByName.info} />
  </svg>
)

export default AppIcon
