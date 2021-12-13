#! /usr/bin/env node

const schedule = require('node-schedule');
const axios = require('axios').default;
const os = require('node-os-utils');
const fs = require('fs');

function send(url, cpu, memory, disk) {
  axios.post(url, {
    cpu: cpu,
    memory: memory,
    disk: disk
  }).catch((err) => {
    console.log(err);
  });
}

async function getCPU() {
  let cpu = await os.cpu.usage();
  return Number(cpu).toFixed(2);
}

async function getMemory() {
  let mem = await os.mem.used();
  let used = (mem.usedMemMb / mem.totalMemMb) * 100;
  return Number(used).toFixed(2);
}

async function getDisk() {
  let disk = await os.drive.used("/");
  return Number(disk.usedPercentage).toFixed(2);
}

function main() {
  fs.readFile('/usr/local/share/vmonitor/config.json', 'utf8', (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const config = JSON.parse(data);
      schedule.scheduleJob('* * * * *', async function() {
        let cpu = await getCPU();
        let mem = await getMemory();
        let disk = await getDisk();
        send(config.url, cpu, mem, disk);
      });
    }
  });
}

if (require.main === module) {
  main();
}