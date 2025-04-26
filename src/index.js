const { useMultiFileAuthState, default: makeWASocket, DisconnectReason } = require("baileys")

const userContext = {}

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        // can provide additional config here
        auth: state,
        printQRInTerminal: true
    })
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async event => {
        for (const m of event.messages) {
            console.log(JSON.stringify(m, undefined, 2))

            const id = m.key.remoteJid;
            if(event.type != 'notify' || m.key.fromMe || id.includes("@g.us") || id.includes("@broadcast")){
                return;
            }

            const mensaje = m.message?.conversation || m.message?.extendedTextMessage?.text;
            const nombre =m.pushName;
            
            if(!userContext[id]){
                userContext[id] = {menuActual: "main"};
                enviarMenu(sock, id, "main");
                return;
            }

            const menuActual = userContext[id].menuActual;
            const menu = menuData[menuActual];

            const opcionSeleccionada = menu.options[mensaje];
            if(opcionSeleccionada){
                if(opcionSeleccionada.respuesta){
                    const tipo = opcionSeleccionada.respuesta.tipo;
                    if(tipo == "text"){
                        await sock.sendMessage(id, {text: opcionSeleccionada.respuesta.msg});
                    }
                    if(tipo == "image"){
                        await sock.sendMessage(id, {image: {url: opcionSeleccionada.respuesta.msg}});
                    }
                    if(tipo == "location"){
                        await sock.sendMessage(id, {location: opcionSeleccionada.respuesta.msg});
                    }

                }
                if(opcionSeleccionada.submenu){
                    userContext[id].menuActual = opcionSeleccionada.submenu;
                    enviarMenu(sock, id, opcionSeleccionada.submenu);
                }
            }else{
                
                // await sock.sendMessage(id, {text: "Por favor, elige una opción valida del de menú o escribenos a a +59173277937"});
                // await sock.sendMessage(id, {document: {url: "https://www.turnerlibros.com/wp-content/uploads/2021/02/ejemplo.pdf"}, fileName: "Nuestros Médicos", caption: "También le envio todos los datos de nuestros agentes."})
            }

            // console.log('replying to', m.key.remoteJid)
            // await sock.sendMessage(m.key.remoteJid, { text: 'Hola Mundo' })
        }
    })

    // to storage creds (session info) when it updates
    sock.ev.on('creds.update', saveCreds)
}
// run in main file
connectToWhatsApp();


async function enviarMenu(sock, id, menuKey){
    const menu = menuData[menuKey];

    const optionText = Object.entries(menu.options)
                            .map(([key, option]) => `- 👉 *${key}*: ${option.text}`)
                            .join("\n");
    
    const menuMensaje = `${menu.mensaje}\n${optionText}\n\n> *Indícanos qué opción te interesa conocer!!*`;

    await sock.sendMessage(id, {text: menuMensaje})
}

const menuData = {
    main: {
        mensaje: "🌟 ¡Hola! Bienvenido a nuestra clínica. ¿Cómo podemos ayudarte hoy? 🌟",
        options: {
            A: {
                text: "🩺 Más Información sobre la clínica",
                respuesta: {
                    tipo: "text",
                    msg: "Somos una clínica con más de 10 años de experiencia en atención médica especializada. Contamos con un equipo de profesionales altamente capacitados y tecnología de punta para tu salud. 🏥 Además, ofrecemos un ambiente cómodo y accesible para ti y tu familia. 👨‍👩‍👧‍👦"
                }
            },
            B: {
                text: "📜 Ver Catálogo de Servicios",
                respuesta: {
                    tipo: "image",
                    msg: "https://tuimagen.com/catalogo-servicios.jpg"
                }
            },
            C: {
                text: "📍 Ver Nuestra Ubicación",
                respuesta: {
                    tipo: "location",
                    msg: {
                        address: "Calle de la Salud, Zona Norte.",
                        degreesLatitude: -16.5000,
                        degreesLongitude: -68.1500,
                    }
                }
            },
            D: {
                text: "💼 Nuestros Servicios Médicos",
                submenu: "servicios"
            },
            E: {
                text: "🕒 Horarios de Atención",
                respuesta: {
                    tipo: "text",
                    msg: "Nuestros horarios de atención son de lunes a viernes de 8:00 AM a 6:00 PM, y los sábados de 9:00 AM a 2:00 PM. ¡Te esperamos! 🕒"
                }
            },
            F: {
                text: "☎️ Contacto y Agendar Cita",
                submenu: "contacto"
            }
        }

    },
    servicios: {
        mensaje: "*👨‍⚕️ Servicios Médicos que ofrecemos 👩‍⚕️*",
        options: {
            1: {
                text: "🩺 Consultas Médicas Generales",
                respuesta: {
                    tipo: "text",
                    msg: "Ofrecemos consultas médicas generales para toda la familia. Diagnóstico y tratamiento de enfermedades comunes. 🩺👶👵"
                }
            },
            2: {
                text: "💉 Exámenes y Pruebas Médicas",
                respuesta: {
                    tipo: "text",
                    msg: "Realizamos pruebas de laboratorio, análisis de sangre, exámenes de imágenes, y más para diagnóstico y prevención. 🧪"
                }
            },
            3: {
                text: "🏥 Servicios de Urgencias 24/7",
                respuesta: {
                    tipo: "text",
                    msg: "Nuestro equipo está disponible las 24 horas del día para atender emergencias médicas. 🚑 No importa la hora, ¡estamos aquí para ayudarte! ⚠️"
                }
            },
            4: {
                text: "🦷 Cirugías Especializadas",
                respuesta: {
                    tipo: "text",
                    msg: "Contamos con especialistas en cirugía para procedimientos mínimamente invasivos, ortopedia, ginecología, y más. 💉🦵"
                }
            },
            5: {
                text: "💼 Volver al Menú Principal",
                submenu: "main"
            }
        }
    },
    contacto: {
        mensaje: "*📞 Contáctanos y Agenda tu Cita*",
        options: {
            1: {
                text: "📅 Agendar Cita Médica",
                respuesta: {
                    tipo: "text",
                    msg: "Para agendar una cita, por favor indícanos el tipo de consulta que deseas realizar y nuestra operadora te contactará para confirmar. 📆"
                }
            },
            2: {
                text: "📞 Llamar al Teléfono de la Clínica",
                respuesta: {
                    tipo: "text",
                    msg: "Puedes llamarnos al siguiente número para más información o para agendar tu cita: +123 456 7890. ☎️"
                }
            },
            3: {
                text: "📧 Enviar un Correo Electrónico",
                respuesta: {
                    tipo: "text",
                    msg: "También puedes enviarnos un correo a contacto@clinica.com para consultas o agendar tu cita. 📧"
                }
            },
            4: {
                text: "💼 Volver al Menú Principal",
                submenu: "main"
            }
        }
    }
}


/*
const menuData = {
    main: {
        mensaje: "Hola, Bienvenido a nuestra empresa! ¿Cómo podemos ayudarte?",
        options: {
            A: {
                text: "Más Información",
                respuesta: {
                    tipo: "text",
                    msg: "Nosotros somos una empresa que llevamos 5 años..."
                }
            },
            B: {
                text: "Ver Catalogo",
                respuesta: {
                    tipo: "image",
                    msg: "https://marketplace.canva.com/EAGJgDOw7to/2/0/1131w/canva-documento-a4-catalogo-de-productos-en-oferta-comercial-promocional-naranja-y-azul-clbsy3nb350.jpg"
                }
            },
            C: {
                text: "Ver Nuestra ubicación",
                respuesta: {
                    tipo: "location",
                    msg: {
                        address: "Av. 6 de Agosto, Zona ABC.",
                        degreesLatitude: -16.51231,
                        degreesLongitude: -68.151221,
                    }
                }                
            },
            D: {
                text: "Nuestros Servicios",
                submenu: "servicios"              
            }
        }

    },
    servicios: {
        mensaje: "*Observe nuestros servicios*",
        options: {
            1: {
                text: "Desarrollo de sistemas",
                respuesta: {
                    tipo: "text",
                    msg: "Desarrollamnos software a medida"
                }
            },
            2: {
                text: "Asesoramiento",
                respuesta: {
                    tipo: "text",
                    msg: "Brindamos asesoramiento.."
                }
            },
            3: {
                text: "Nuestros Servicios",
                submenu: "main"              
            }
        }

    },
}

*/
/*
*Hola* 👋 Bienvenid@ a *Blumbit* 🌟. Selecciona el *Curso* que te interesa y te enviaremos la información correspondiente:

- 👉 *A*: Docker para Desarrolladores
- 👉 *B*: ChatBots para WhatsApp📱
- 👉 *C*: Especialización en Desarrollo Web FullStack
- 👉 *D*: Quiero hablar con un asesor

> *Indícanos qué opción te interesa conocer!* 
*/