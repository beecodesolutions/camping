import { useState } from 'react'
import { Box, useTheme } from '@mui/material'

export default function CampingIllustration() {
  const [showVehicle] = useState(() => Math.random() < 0.5)
  const theme = useTheme()
  const isNight = theme.palette.mode === 'dark'
  return (
    <Box
      component="svg"
      viewBox="0 0 280 180"
      aria-hidden="true"
      focusable="false"
      sx={{
        width: { xs: 72, sm: 100 },
        height: 'auto',
        flexShrink: 0,
        color: 'primary.main',
      }}
    >
      {isNight ? (
        <g fill={theme.palette.secondary.main}>
          <path d="M228 17a18 18 0 1 0 11 29 17 17 0 0 1-11-29Z" />
          <path d="m155 15 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm35 26 2 4 4 2-4 2-2 4-2-4-4-2 4-2ZM48 24l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" />
          <circle cx="119" cy="21" r="2" />
          <circle cx="259" cy="63" r="2" />
        </g>
      ) : (
        <Box
          component="circle"
          cx="220"
          cy="35"
          r="18"
          sx={(theme) => ({
            fill: theme.palette.secondary.main,
            stroke: theme.palette.secondary.dark,
            strokeWidth: 3,
          })}
        />
      )}
      <path
        d="M12 145 85 42l59 80 35-49 88 72Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path d="m67 67 18-25 19 26-20-7Z" fill="currentColor" opacity="0.6" />
      <path
        d="M48 158Q29 155 20 133Q42 141 48 158ZM48 158Q29 136 32 116Q47 133 48 158ZM48 158Q41 129 51 113Q55 137 48 158ZM48 158Q52 132 68 122Q66 145 48 158ZM48 158Q62 141 79 141Q68 156 48 158Z"
        fill="currentColor"
      />
      <path
        d="M240 158Q223 155 216 137Q235 143 240 158ZM240 158Q224 139 227 122Q239 137 240 158ZM240 158Q234 133 243 119Q246 140 240 158ZM240 158Q244 136 258 127Q256 147 240 158ZM240 158Q252 143 267 143Q257 156 240 158Z"
        fill="currentColor"
      />
      <path
        d="M15 160h250"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {showVehicle ? (
        <g strokeLinejoin="round">
          <path
            d="M88 142v-36h76l15 19 27 3 3 20H88Z"
            fill="#CE793C"
            stroke="#38443C"
            strokeWidth="3"
          />
          <path
            d="M96 111h21v18H96Zm27 0h22v18h-22Zm28 0h11l13 18h-24Z"
            fill={theme.palette.background.default}
          />
          <path
            d="M120 132v14m28-14v14m-20-10h7m20 0h6"
            fill="none"
            stroke="#75482D"
            strokeWidth="2"
          />
          <path
            d="M91 147v-6q17-18 33 0v6m45 0v-6q16-18 31 0v6M84 147h9m31 0h45m31 0h12"
            fill="none"
            stroke="#28352D"
            strokeWidth="5"
          />
          <rect x="79" y="118" width="11" height="25" rx="5" fill="#202823" />
          <path d="M84 122v17" stroke="#758378" strokeWidth="2" />
          <rect
            x="201"
            y="131"
            width="7"
            height="5"
            rx="1"
            fill={theme.palette.secondary.light}
          />
          <rect
            x="87"
            y="132"
            width="4"
            height="8"
            rx="1"
            fill={theme.palette.accent.main}
          />
          <g fill="#202823" stroke="#758378" strokeWidth="1.5">
            <circle cx="108" cy="147" r="12" />
            <circle cx="185" cy="147" r="12" />
          </g>
          <g fill="#A9B4AC">
            <circle cx="108" cy="147" r="5" />
            <circle cx="185" cy="147" r="5" />
          </g>
          {isNight ? (
            <>
              <path
                d="M87 99 111 56 177 99Z"
                fill="#667066"
                stroke={theme.palette.secondary.main}
                strokeWidth="2"
              />
              <path d="m87 99 24-43 8 43Z" fill="#39483F" />
              <path
                d="M129 97V85q0-14 10-9l22 21Z"
                fill="#334037"
                stroke={theme.palette.secondary.main}
                strokeWidth="1.5"
              />
              <path d="m111 55 67 44" stroke="#26342C" strokeWidth="4" />
            </>
          ) : (
            <rect
              x="91"
              y="93"
              width="79"
              height="6"
              rx="3"
              fill="#667066"
              stroke="#26342C"
              strokeWidth="2"
            />
          )}
          <path
            d="M86 102h94m-80 0v4m65-4v4"
            stroke="#28352D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {isNight && (
            <path
              d="m129 103 30 55m-20-55 30 55m-34-44h10m-4 11h10m-4 11h10m-4 11h10m-4 10h10"
              fill="none"
              stroke={theme.palette.secondary.main}
              strokeWidth="2.5"
            />
          )}
        </g>
      ) : (
        <>
          <Box
            component="path"
            d="m84 155 49-77h31l47 77Z"
            sx={(theme) => ({ fill: theme.palette.secondary.main })}
          />
          <Box
            component="path"
            d="m84 155 49-77 49 77Z"
            sx={(theme) => ({ fill: theme.palette.secondary.light })}
          />
          {isNight ? (
            <path
              d="M133 81v73m-4-8h8"
              fill="none"
              stroke={theme.palette.secondary.main}
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <Box
              component="path"
              d="m112 155 21-44 22 44Z"
              sx={(theme) => ({ fill: theme.palette.primary.dark })}
            />
          )}
          <path
            d="m133 78 49 77m-49-77-49 77"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      )}
    </Box>
  )
}
