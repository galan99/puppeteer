import cv2
import sys

# print(sys.argv) # 获取命令行参数
'''
教程地址：https://www.csdn.net/tags/MtTaEgxsNDcwODczLWJsb2cO0O0O.html, https://juejin.cn/post/7110578748440707109, https://cloud.tencent.com/developer/article/1904058
环境：python3.10.6
pip版本：pip22.2.2
可以通过命令 pip --version 来判断是否已安装
安装opencv：pip install opencv-python

运行：python code.py ./img/a.png
'''

TARGET_IMAGE = sys.argv[1]

def findPic(target, template, out):
  '''
    target: 背景图片
    template: 缺口图片
    out:输出图片
  '''
  # 读取图片
  target_rgb = cv2.imread(target)
  # 图片灰度化
  target_gray = cv2.cvtColor(target_rgb, cv2.COLOR_BGR2GRAY)
  # 读取模块图片
  template_rgb = cv2.imread(template, 0)
  # 匹配模块位置
  res = cv2.matchTemplate(target_gray, template_rgb, cv2.TM_CCOEFF_NORMED)
  # 获取最佳匹配位置
  value = cv2.minMaxLoc(res)

  image_width, image_height = template_rgb.shape
  x, y = value[2]

  print(x)

  cv2.rectangle(target_rgb, (x, y), (x + image_width, y + image_height), (0, 0, 255), 2) # 绘制矩形
  cv2.imwrite(out, target_rgb) # 保存在本地

  # 返回最佳X坐标
  return value[2][0]


def main():
  findPic(TARGET_IMAGE, './img/btn.png', './dist/1.png')
  # findPic("./img/a.png", './img/btn2.png', './dist/2.png')


if __name__ == '__main__':
  main()